/**
 * What the next move on a ticket promises, in words, before it is tapped.
 *
 * The move itself comes from `lib/order-flow` — one state machine, shared with
 * the service layer. This file is only the caption line above the button: the
 * consequence, with this order's own clock number in it rather than a guess.
 */
import { formatLate } from "@repo/ui";
import { formatClock, minutesUntil } from "./format";
import { MOVES, moveFrom } from "../../lib/order-flow";
import type { OrderStatus, Permission } from "../../lib/types";

export interface NextTransition {
  readonly toStatus: OrderStatus;
  /** The verb. This is the biggest thing on the card. */
  readonly label: string;
  /** The consequence, with the real clock number, stated before the tap. */
  readonly consequence: string;
  readonly needs: Permission;
  /** True for a courier's move the kitchen is standing in for. */
  readonly standsInForCourier: boolean;
}

/**
 * What a ticket is waiting on when there is nothing left for the kitchen to
 * press. `delivered` and `cancelled` only — every other status now has a move,
 * because with no delivery partner the kitchen owns the whole ladder.
 */
const WAITING_NOTES: Partial<Record<OrderStatus, string>> = {
  delivered: "Delivered. This order has left the queue.",
  cancelled: "Cancelled. This order has left the queue.",
};

function describePromise(
  promisedAt: string,
  now: number,
  onTime: (clock: string, left: string) => string,
): string {
  const remaining = minutesUntil(promisedAt, now);
  const clock = formatClock(promisedAt);
  if (remaining < 0) {
    return `Already ${formatLate(-remaining)} past the ${clock} promise`;
  }
  // formatLate(0) reads "on time", which would be nonsense as a countdown.
  if (remaining === 0) return `Due right now — the ${clock} promise is up`;
  return onTime(clock, formatLate(remaining));
}

/** One sentence per move, each naming what the customer was actually promised. */
const CONSEQUENCE: Record<
  OrderStatus,
  ((promisedAt: string, now: number) => string) | undefined
> = {
  pending: (promisedAt, now) =>
    describePromise(
      promisedAt,
      now,
      (clock, left) => `Promises it ready by ${clock} — ${left} from now`,
    ),
  confirmed: (promisedAt, now) =>
    describePromise(
      promisedAt,
      now,
      (clock, left) => `${left} of cooking time before ${clock}`,
    ),
  preparing: (promisedAt, now) =>
    describePromise(
      promisedAt,
      now,
      (clock, left) => `${left} to spare on the ${clock} promise`,
    ),
  // Short on purpose: this is the one caption line above the button, read at
  // two feet. There is no delivery partner yet, so both moves are the kitchen's.
  ready_for_pickup: () => "Records that the food left the kitchen.",
  out_for_delivery: () => "Counts as revenue. Only once the customer has the food.",
  delivered: undefined,
  cancelled: undefined,
};

export function getNextTransition(
  status: OrderStatus,
  promisedAt: string,
  now: number,
): NextTransition | null {
  const move = moveFrom(status);
  if (move === null) return null;
  return {
    toStatus: move.to,
    label: move.label,
    consequence: CONSEQUENCE[status]?.(promisedAt, now) ?? "",
    needs: move.needs,
    standsInForCourier: move.standsInForCourier === true,
  };
}

export function getWaitingNote(status: OrderStatus): string | null {
  return WAITING_NOTES[status] ?? null;
}

/** True while this ticket still has a button for the kitchen to press. */
export function hasKitchenDecision(status: OrderStatus): boolean {
  return MOVES[status] !== undefined;
}
