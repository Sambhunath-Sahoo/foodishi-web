/**
 * Orders, from the seed and whatever this browser has done to it.
 *
 * The state machine here is the server's, mirrored: a restaurant may walk a
 * ticket forward one step at a time and never backwards, and each step needs a
 * different permission because they are different jobs. The last two steps —
 * handing over and marking delivered — belong to a delivery partner in the
 * finished product. There is not one yet, so the kitchen makes them, and the
 * words on screen say so rather than pretending a courier exists.
 */
import type {
  Address,
  CancelResult,
  Customer,
  Order,
  OrderClock,
  OrderDetail,
  OrderEvent,
  OrderStatus,
  OrdersPage,
} from "../../types";
import type { OrderQuery, OrdersService, RefuseOrder, StatusChange } from "../types";
import {
  CANCELLABLE_STATUSES,
  MOVES,
  SETTLED_STATUSES,
} from "../../order-flow";
import { omit } from "../../omit";
import { ConflictError, UnprocessableError, settle } from "./latency";
import { requirePermission, requireFound } from "./guard";
import { requireSignedIn } from "./identity";
import {
  appendEvent,
  eventsFor,
  findOrder,
  findRestaurant,
  ordersFor,
  seedCustomers,
  takeId,
  writeOrder,
} from "./store";

const MS_PER_MINUTE = 60_000;

function isLive(order: Order): boolean {
  return !SETTLED_STATUSES.has(order.status);
}

function matches(order: OrderDetail, query: OrderQuery): boolean {
  if (query.live === true && !isLive(order)) return false;
  if (query.status !== undefined && order.status !== query.status) return false;
  const placed = new Date(order.placed_at).getTime();
  if (query.placedFrom !== undefined && placed < new Date(query.placedFrom).getTime()) {
    return false;
  }
  if (query.placedTo !== undefined && placed >= new Date(query.placedTo).getTime()) {
    return false;
  }
  if (query.q !== undefined && query.q.trim() !== "") {
    const needle = query.q.trim().toLowerCase();
    const customer = seedCustomers().users.find((user) => user.id === order.user_id);
    const name = (customer as { readonly name?: string } | undefined)?.name ?? "";
    const haystack = `${order.id} ${name} ${order.items.map((line) => line.item_name).join(" ")}`;
    if (!haystack.toLowerCase().includes(needle)) return false;
  }
  return true;
}

/** The list endpoint's shape: rows without their lines, plus the total. */
function toPage(rows: readonly OrderDetail[], query: OrderQuery): OrdersPage {
  const page = rows.slice(query.offset, query.offset + query.limit);
  return {
    items: page.map((order) => omit(order, "items")),
    total: rows.length,
    limit: query.limit,
    offset: query.offset,
  };
}

function event(
  orderId: number,
  from: OrderStatus | null,
  to: OrderStatus,
  actorId: number,
  reason: string | null,
): OrderEvent {
  return {
    id: takeId("event"),
    from_status: from,
    to_status: to,
    actor_type: "restaurant",
    actor_id: actorId,
    reason,
    created_at: new Date().toISOString(),
  };
}

/**
 * What a refusal actually returns to the customer.
 *
 * The order total is NOT the refund. A kitchen's own withdrawal never carries
 * the cancellation fee, however long the ticket sat unread — that fee exists for
 * a customer changing their mind. So the fee is zero here and the refund is
 * whatever was captured, which for a ticket the kitchen never accepted is the
 * whole total and for one already cooking is the same. The real backend will
 * refund `captured_total`, which can be less; the fixture is explicit that it
 * is modelling the happy case.
 */
function refuse(order: OrderDetail, reason: string, actorId: number): CancelResult {
  const now = new Date();
  const cancelled: OrderDetail = {
    ...order,
    status: "cancelled",
    cancelled_at: now.toISOString(),
    cancellation_reason: reason,
  };
  writeOrder(cancelled);
  appendEvent(order.id, event(order.id, order.status, "cancelled", actorId, reason));

  const restaurant = findRestaurant(order.restaurant_id);

  return {
    order: omit(cancelled, "items"),
    within_window: now.getTime() <= new Date(order.cancellable_until).getTime(),
    cancellation_fee: "0.00",
    refund_amount: order.total_amount,
    refund_id: takeId("event"),
    refund_due_at: new Date(
      now.getTime() + (restaurant?.policy?.refund_sla_hours ?? 48) * 60 * MS_PER_MINUTE,
    ).toISOString(),
  };
}

export const fixtureOrders: OrdersService = {
  list(query) {
    requirePermission(query.restaurantId, "orders.view");
    const rows = ordersFor(query.restaurantId).filter((order) => matches(order, query));
    return settle(toPage(rows, query));
  },

  get(orderId) {
    const order = requireFound(findOrder(orderId), `Order #${orderId}`);
    requirePermission(order.restaurant_id, "orders.view");
    return settle(order);
  },

  getClock(orderId) {
    const order = requireFound(findOrder(orderId), `Order #${orderId}`);
    requirePermission(order.restaurant_id, "orders.view");
    const now = Date.now();
    const promised = new Date(order.promised_at).getTime();
    const clock: OrderClock = {
      id: order.id,
      status: order.status,
      promised_at: order.promised_at,
      minutes_remaining: Math.ceil((promised - now) / MS_PER_MINUTE),
      is_late: !SETTLED_STATUSES.has(order.status) && promised < now,
      cancellable_until: order.cancellable_until,
      is_cancellable: CANCELLABLE_STATUSES.has(order.status),
    };
    return settle(clock, 60);
  },

  listEvents(orderId) {
    const order = requireFound(findOrder(orderId), `Order #${orderId}`);
    requirePermission(order.restaurant_id, "orders.view");
    return settle(eventsFor(orderId));
  },

  updateStatus({ orderId, status }: StatusChange) {
    const actorId = requireSignedIn();
    const order = requireFound(findOrder(orderId), `Order #${orderId}`);
    const step = MOVES[order.status];

    if (step === undefined) {
      throw new ConflictError(
        `Order #${orderId} is ${order.status.replace(/_/g, " ")} — there is nothing left for the kitchen to move.`,
      );
    }
    if (step.to !== status) {
      throw new ConflictError(
        `Order #${orderId} can only go to ${step.to.replace(/_/g, " ")} from here.`,
      );
    }
    requirePermission(order.restaurant_id, step.needs);

    const moved: OrderDetail = {
      ...order,
      status,
      delivered_at: status === "delivered" ? new Date().toISOString() : order.delivered_at,
    };
    writeOrder(moved);
    appendEvent(orderId, event(orderId, order.status, status, actorId, null));

    return settle(omit(moved, "items"));
  },

  reject({ orderId, reason }: RefuseOrder) {
    const actorId = requireSignedIn();
    const order = requireFound(findOrder(orderId), `Order #${orderId}`);
    requirePermission(order.restaurant_id, "orders.reject");
    if (order.status !== "pending") {
      // Rejecting and cancelling are different promises to the customer, so
      // one is never quietly treated as the other.
      throw new ConflictError(
        `Order #${orderId} has already been accepted. Cancel it instead — that is a broken promise and is recorded as one.`,
      );
    }
    if (reason.trim() === "") {
      throw new UnprocessableError("Say why the kitchen is turning this order down.");
    }
    return settle(refuse(order, reason.trim(), actorId));
  },

  cancel({ orderId, reason }: RefuseOrder) {
    const actorId = requireSignedIn();
    const order = requireFound(findOrder(orderId), `Order #${orderId}`);
    requirePermission(order.restaurant_id, "orders.cancel");
    if (!CANCELLABLE_STATUSES.has(order.status)) {
      throw new ConflictError(
        `Order #${orderId} is ${order.status.replace(/_/g, " ")} and is no longer the kitchen's to cancel.`,
      );
    }
    if (reason.trim() === "") {
      throw new UnprocessableError("Say why this order is being cancelled.");
    }
    return settle(refuse(order, reason.trim(), actorId));
  },

  getCustomer(userId) {
    const row = seedCustomers().users.find((user) => user.id === userId);
    return settle(requireFound((row as Customer | undefined) ?? null, "That customer"));
  },

  getAddress(addressId) {
    const row = seedCustomers().addresses.find((address) => address.id === addressId);
    return settle(requireFound((row as Address | undefined) ?? null, "That address"));
  },
};
