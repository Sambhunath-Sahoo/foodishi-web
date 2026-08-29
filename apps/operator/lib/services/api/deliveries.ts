/**
 * Rides across the whole platform, against the live API.
 *
 * The join is the server's here, and that is the only real difference from the
 * fixture. `fixtures/deliveries.ts` builds each board row by hand — a delivery,
 * then a lookup for the order it belongs to — because the only ride route was
 * `GET /orders/{id}/delivery`, which answers one. `GET /admin/deliveries`
 * returns that pair already joined as `AdminDeliveryRow`, so this file's whole
 * job is splitting it back into the two halves `DeliveryBoardRow` names.
 *
 * Everything except `/delivery-partners` sits under `/admin`, whose router
 * carries `require_platform_role()` as a router-level dependency. So no
 * restaurant scope is sent or derived anywhere below, and a signed-in customer
 * gets a 403 rather than a thin page.
 *
 * No method takes an AbortSignal, because `DeliveriesService` declares none:
 * the board repolls on an interval and React Query discards the stale answer.
 */
import { api } from "@repo/api-client";
import type { components } from "@repo/api-client";
import type {
  DeliveryPartnerRead,
  DeliveryStatus,
  Page,
} from "../../api-types";
import type {
  DeliveriesService,
  DeliveryBoardRow,
  DeliveryFilter,
  DeliveryQuery,
} from "../types";

/**
 * A ride, its rider and its order in one row.
 *
 * Taken from `components` rather than `lib/api-types`, which does not name it:
 * `AdminDeliveryRow` is `DeliveryDetail` plus `order`, and only this file and
 * the board need it. Aliasing it here keeps the drift a build error without
 * widening the console's shared vocabulary for one caller.
 */
type WireDeliveryRow = components["schemas"]["AdminDeliveryRow"];
type WireDeliveryFilter = components["schemas"]["DeliveryFilter"];

/** The most riders the wire will hand over at once (core.pagination.MAX_LIMIT). */
const PARTNER_LIMIT = 100;

/**
 * The console's filter IS the wire's, member for member — "active" spans
 * assigned and picked_up on both sides, and "any" drops the predicate on both.
 *
 * Passed through a typed function rather than inline so the two enums cannot
 * drift silently: a member added to `DeliveryFilter` in types.ts, or removed
 * from the API's own `DeliveryFilter`, fails to compile here instead of
 * reaching the server as an unknown value and coming back a 422.
 */
function toWireFilter(status: DeliveryFilter): WireDeliveryFilter {
  return status;
}

/**
 * `AdminDeliveryRow` back into the delivery and the order beside it.
 *
 * The rest of the row is `DeliveryDetail` field for field, so the two halves
 * are separated rather than copied out one key at a time — a hand-written copy
 * would need editing every time the delivery schema gains a column, and would
 * quietly drop it until somebody noticed.
 */
function toBoardRow({ order, ...delivery }: WireDeliveryRow): DeliveryBoardRow {
  return { delivery, order };
}

export const apiDeliveries: DeliveriesService = {
  async listDeliveries(query: DeliveryQuery) {
    const page = await api.get<Page<WireDeliveryRow>>("/admin/deliveries", {
      query: {
        // `q` is Query(min_length=1) on the wire, so an empty search box has to
        // be omitted rather than sent as "" — sending it would turn "no filter"
        // into a 422 on the board's very first render.
        q: query.q.trim() === "" ? undefined : query.q.trim(),
        status: toWireFilter(query.status),
        limit: query.limit,
        offset: query.offset,
      },
    });
    // Spread and override, so `total`, `limit` and `offset` stay the server's
    // own — the board pages off `total`, and recomputing it here would be a
    // second number able to disagree with the one the rows came from.
    return { ...page, items: page.items.map(toBoardRow) };
  },

  async countByStatus() {
    // `dict[str, int]` on the wire, so the generated type is an index map with
    // no knowledge of which keys can appear. The handler seeds every
    // DeliveryStatus at zero before the GROUP BY overwrites what it found, so
    // in practice all four arrive — but the type cannot say so, and a rail
    // reading `counts.failed` off an index map would draw a GAP rather than a
    // zero if a key were ever missing. "No failed rides" and "we did not
    // count" are different facts and the card has room for only one of them.
    const counts = await api.get<Readonly<Record<string, number>>>(
      "/admin/deliveries/count",
    );
    const tally: Readonly<Record<DeliveryStatus, number>> = {
      assigned: counts.assigned ?? 0,
      picked_up: counts.picked_up ?? 0,
      delivered: counts.delivered ?? 0,
      failed: counts.failed ?? 0,
    };
    return tally;
  },

  async listPartners() {
    // Paged on the wire, a plain list in the interface: the platform has a few
    // dozen riders, and a reassignment dialog that paged them would be asking a
    // question nobody has. The limit is the API's own maximum.
    //
    // `is_available` is deliberately NOT sent. It is the obvious filter and it
    // is the wrong one here: the rider somebody wants to hand a stalled ride to
    // is often mid-shift on another one, and the server frees the old rider as
    // part of the reassign anyway. An availability-filtered list would hide the
    // useful half of the roster.
    const page = await api.get<Page<DeliveryPartnerRead>>("/delivery-partners", {
      query: { limit: PARTNER_LIMIT, offset: 0 },
    });
    return page.items;
  },

  async reassign(deliveryId, partnerId) {
    // A delivered ride, or the rider who is already on it, come back as 409s
    // carrying the server's own sentence — the fixture raises those two as
    // local 422s. Neither is re-derived here: the check has to be the server's
    // to be true at the moment the write lands, and `ApiError` already gives
    // the dialog the detail to show.
    const row = await api.post<WireDeliveryRow>(
      `/admin/deliveries/${deliveryId}/reassign`,
      { partner_id: partnerId },
    );
    return toBoardRow(row);
  },

  async markFailed(deliveryId, reason) {
    // Trimmed because the wire's `reason` is Field(min_length=3, max_length=200)
    // and the schema strips whitespace before measuring: sending "   " would be
    // refused for a length the operator cannot see in the box they typed into.
    const row = await api.post<WireDeliveryRow>(
      `/admin/deliveries/${deliveryId}/fail`,
      { reason: reason.trim() },
    );
    return toBoardRow(row);
  },
};
