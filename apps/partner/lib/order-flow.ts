/**
 * What a restaurant may do to an order next, and what it takes to do it.
 *
 * This is the order state machine as this console understands it, in one place
 * and belonging to neither data source. The fixtures enforce it; the API
 * enforces its own copy server-side and this mirrors that copy. A screen asks
 * here rather than switching on a status string, so the queue, the ticket
 * header and the pickup board can never disagree about what the next move is.
 *
 * The last two steps are not the kitchen's in the finished product — a delivery
 * partner hands over and marks delivered. There is no delivery partner yet, so
 * the kitchen makes both moves and every label that draws them says so.
 */
import type { OrderStatus, Permission } from "./types";

/** Neither delivered nor cancelled: still somebody's problem. */
export const SETTLED_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "delivered",
  "cancelled",
]);

export interface Move {
  readonly to: OrderStatus;
  /** The verb. This is the biggest thing on a ticket. */
  readonly label: string;
  readonly needs: Permission;
  /**
   * True for a move that belongs to a courier and is here only because there
   * is no courier. Screens say so rather than implying dispatch happened.
   */
  readonly standsInForCourier?: boolean;
}

/**
 * One forward step from each status. Never backwards, and never two steps.
 *
 * Three different permissions across five moves, because they are three
 * different jobs: answering a ticket, cooking it, and sending it out. A
 * kitchen that wants its evening staff to cook but not to accept can say so.
 */
export const MOVES: Partial<Record<OrderStatus, Move>> = {
  pending: { to: "confirmed", label: "Accept", needs: "orders.accept" },
  confirmed: { to: "preparing", label: "Start preparing", needs: "orders.status" },
  preparing: { to: "ready_for_pickup", label: "Mark ready", needs: "orders.status" },
  ready_for_pickup: {
    to: "out_for_delivery",
    label: "Hand over",
    needs: "handover.mark",
    standsInForCourier: true,
  },
  out_for_delivery: {
    to: "delivered",
    label: "Mark delivered",
    needs: "handover.mark",
    standsInForCourier: true,
  },
};

/** Statuses a restaurant may still cancel. Past ready it is out of its hands. */
export const CANCELLABLE_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "pending",
  "confirmed",
  "preparing",
]);

/** Waiting to be picked up, or already with whoever is delivering it. */
export const HANDOVER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "ready_for_pickup",
  "out_for_delivery",
]);

export function moveFrom(status: OrderStatus): Move | null {
  return MOVES[status] ?? null;
}

export function canRestaurantCancel(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.has(status);
}

/** True while this ticket still has a move somebody in the kitchen can make. */
export function hasKitchenDecision(status: OrderStatus): boolean {
  return MOVES[status] !== undefined;
}

/** The kitchen's own share of the ladder: accept, cook, mark ready. */
export function isKitchenWork(status: OrderStatus): boolean {
  const move = MOVES[status];
  return move !== undefined && move.standsInForCourier !== true;
}
