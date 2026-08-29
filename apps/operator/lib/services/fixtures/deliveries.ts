import type { DeliveryDetail, DeliveryStatus, OrderRead } from "../../api-types";
import type {
  DeliveriesService,
  DeliveryBoardRow,
  DeliveryFilter,
  DeliveryQuery,
} from "../types";
import { NotFoundError, settle, settleWrite, UnprocessableError } from "./latency";
import { matches, toPage } from "./paging";
import { findOrderDetail, toOrderRead } from "./orders";
import { SEED_PARTNERS } from "./seed";
import { allDeliveries, appendEvent, findDelivery, patchDelivery } from "./store";

/**
 * Deliveries, with the order they belong to attached.
 *
 * The API answers one ride at a time, off the order — which is right for a
 * tracking screen and useless for an operations board that has to see every
 * ride at once. So the join happens here: one row is a delivery and its order,
 * which is the shape a real list endpoint would return and the shape that keeps
 * the board from firing a hundred requests to draw a hundred rows.
 *
 * Two writes, and they are the two jobs on the checklist. Reassigning hands a
 * stalled ride to somebody else; marking one failed gives up on it. Both record
 * an event on the order's own trail, because a ride that changed hands and left
 * no trace behind it is exactly what makes a support call unanswerable.
 */

/** A ride that is still somebody's problem. The board's default question. */
const ACTIVE_STATUSES: readonly DeliveryStatus[] = ["assigned", "picked_up"];

/** Statuses each filter admits. Null admits every one of them. */
const FILTERS: Readonly<Record<DeliveryFilter, readonly DeliveryStatus[] | null>> = {
  active: ACTIVE_STATUSES,
  assigned: ["assigned"],
  picked_up: ["picked_up"],
  delivered: ["delivered"],
  failed: ["failed"],
  any: null,
};

function toRow(delivery: DeliveryDetail): DeliveryBoardRow | null {
  const order = findOrderDetail(delivery.order_id);
  // A delivery whose order does not exist is broken data, not a row to draw.
  return order === null ? null : { delivery, order: toOrderRead(order) };
}

function isRow(row: DeliveryBoardRow | null): row is DeliveryBoardRow {
  return row !== null;
}

/** A ride still on the road first, then the newest. */
function byUrgency(left: DeliveryBoardRow, right: DeliveryBoardRow): number {
  const leftActive = ACTIVE_STATUSES.includes(left.delivery.status) ? 0 : 1;
  const rightActive = ACTIVE_STATUSES.includes(right.delivery.status) ? 0 : 1;
  return (
    leftActive - rightActive ||
    Date.parse(right.delivery.assigned_at) - Date.parse(left.delivery.assigned_at)
  );
}

function selectRows(query: DeliveryQuery): readonly DeliveryBoardRow[] {
  const allowed = FILTERS[query.status];
  const term = query.q.trim();

  return allDeliveries()
    .filter((delivery) => allowed === null || allowed.includes(delivery.status))
    .map(toRow)
    .filter(isRow)
    .filter((row) => {
      if (term === "") return true;
      const haystack = [
        String(row.order.id),
        row.delivery.partner.name,
        row.delivery.partner.phone,
        row.delivery.partner.vehicle_type,
      ].join(" ");
      return matches(haystack, term);
    })
    .sort(byUrgency);
}

function requireDelivery(deliveryId: number): DeliveryDetail {
  const delivery = findDelivery(deliveryId);
  if (delivery === null) {
    throw new NotFoundError(`No delivery with id ${String(deliveryId)}.`);
  }
  return delivery;
}

function requireRow(deliveryId: number): DeliveryBoardRow {
  const row = toRow(requireDelivery(deliveryId));
  if (row === null) {
    throw new NotFoundError(
      `Delivery ${String(deliveryId)} points at an order that is not on record.`,
    );
  }
  return row;
}

/** The order's own status, restated on its trail when a ride changes hands. */
function recordOnOrder(order: OrderRead, reason: string): void {
  appendEvent(order.id, (id) => ({
    id,
    from_status: order.status,
    to_status: order.status,
    actor_type: "system",
    actor_id: null,
    reason,
    created_at: new Date().toISOString(),
  }));
}

export const fixtureDeliveries: DeliveriesService = {
  listDeliveries: (query) => settle(toPage(selectRows(query), query)),

  countByStatus: () => {
    // Every status is present in the answer, at zero if need be: a board drawing
    // a card per status would otherwise have to decide what a missing key means,
    // and "no failed rides" and "we did not count" are different facts.
    const tally: Record<DeliveryStatus, number> = {
      assigned: 0,
      picked_up: 0,
      delivered: 0,
      failed: 0,
    };
    for (const delivery of allDeliveries()) tally[delivery.status] += 1;
    return settle(tally);
  },

  listPartners: () => settle(SEED_PARTNERS),

  reassign: async (deliveryId, partnerId) => {
    const row = requireRow(deliveryId);
    const partner = SEED_PARTNERS.find((candidate) => candidate.id === partnerId);
    if (partner === undefined) {
      throw new NotFoundError(`No delivery partner with id ${String(partnerId)}.`);
    }
    if (row.delivery.status === "delivered") {
      throw new UnprocessableError(
        "This order has already been handed over — there is nothing left to reassign.",
      );
    }
    if (partner.id === row.delivery.partner_id) {
      throw new UnprocessableError(`${partner.name} is already on this delivery.`);
    }

    patchDelivery(deliveryId, {
      partner_id: partner.id,
      partner,
      // A new rider starts from the pass, whatever the last one had reached.
      status: "assigned",
      assigned_at: new Date().toISOString(),
      picked_up_at: null,
    });
    recordOnOrder(row.order, `Delivery reassigned to ${partner.name}`);

    return settleWrite(requireRow(deliveryId));
  },

  markFailed: async (deliveryId, reason) => {
    const row = requireRow(deliveryId);
    if (row.delivery.status === "delivered") {
      throw new UnprocessableError(
        "This order was handed over. A delivered ride cannot be marked failed.",
      );
    }
    if (reason.trim() === "") {
      throw new UnprocessableError(
        "Say what went wrong — this is what support reads back to the customer.",
      );
    }

    patchDelivery(deliveryId, { status: "failed" });
    recordOnOrder(row.order, `Delivery failed — ${reason.trim()}`);

    return settleWrite(requireRow(deliveryId));
  },
};
