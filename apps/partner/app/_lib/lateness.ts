/**
 * How late one ticket is, graded — the single place this tablet decides that
 * (DENSITY.md §3).
 *
 * Before this existed, "671 min late" rendered exactly like "3 min late": one
 * flat `crit` stripe, one raw minute count. Both defects are fixed here rather
 * than in each card, so the queue, the ticket header and the detail screen can
 * never disagree about how bad a ticket is.
 *
 * The thresholds and the formatter are @repo/ui's `lateTier` / `formatLate`.
 * Nothing local re-implements them.
 */
import { formatLate, lateTier, type SeverityTier } from "@repo/ui";
import { formatClock, formatDay, minutesSince, minutesUntil } from "./format";
// A finished ticket is never late, however long ago it was promised — and what
// counts as finished is the order machine's answer, not a local list.
import { SETTLED_STATUSES, isKitchenWork } from "../../lib/order-flow";
import type { OrderStatus } from "../../lib/types";

/**
 * Six hours past the promise. Past this a ticket is not late food any more —
 * nobody is still waiting for it — it is an order somebody has to close.
 * Toast and Square both push tickets this old off the live rail.
 */
export const STALE_AFTER_MINUTES = 360;

/** A day past the promise, the lateness stops being a useful number. */
const DATE_HEADLINE_AFTER_MINUTES = 24 * 60;

export interface Lateness {
  /** Whole minutes past the promise. Zero or negative means still in time. */
  readonly minutesLate: number;
  /** 0 on time · 1 under an hour · 2 one to six hours · 3 beyond six. */
  readonly tier: SeverityTier;
  readonly isLate: boolean;
  /** More than STALE_AFTER_MINUTES past the promise and still open. */
  readonly isStale: boolean;
  /** "6h 32m late" or "22m left" — never a raw count above 90 minutes. */
  readonly headline: string;
  /** The same fact with the promise clock attached, for a second line. */
  readonly detail: string;
}

export function readLateness(
  status: OrderStatus,
  promisedAt: string,
  now: number,
): Lateness {
  const promise = formatClock(promisedAt, now);

  if (SETTLED_STATUSES.has(status)) {
    return {
      minutesLate: 0,
      tier: 0,
      isLate: false,
      isStale: false,
      headline: "Closed",
      detail: `Promised ${promise}`,
    };
  }

  const minutesLate = minutesSince(promisedAt, now);
  if (minutesLate <= 0) {
    const left = minutesUntil(promisedAt, now);
    return {
      minutesLate,
      tier: 0,
      isLate: false,
      isStale: false,
      // `left === 0` is reachable for a FULL MINUTE, not an instant, and
      // formatLate(0) returns the phrase "on time" -- so every ticket read
      // "on time left" for the minute after its promised time, on four surfaces
      // including the largest text on the order-detail screen. minutesSince
      // floors and minutesUntil ceils, so both land on 0 across that window.
      //
      // formatLate was written for ELAPSED time; this branch is REMAINING time,
      // and the zero case is where the two stop being interchangeable. The
      // operator console words the same case "due now".
      headline: left === 0 ? "Due now" : `${formatLate(left)} left`,
      detail: `Due ${promise}`,
    };
  }

  return {
    minutesLate,
    tier: lateTier(minutesLate),
    isLate: true,
    isStale: minutesLate > STALE_AFTER_MINUTES,
    // "44d 20h late" is a number nobody acts on; the day it was due is.
    headline:
      minutesLate > DATE_HEADLINE_AFTER_MINUTES
        ? `Promised ${formatDay(promisedAt)}`
        : `${formatLate(minutesLate)} late`,
    detail: `Promised ${promise}`,
  };
}

/** Mirrors the source's own is_late: past the promise, and not finished. */
export function isOrderLate(
  status: OrderStatus,
  promisedAt: string,
  now: number,
): boolean {
  return readLateness(status, promisedAt, now).isLate;
}

interface Promised {
  readonly status: OrderStatus;
  readonly promised_at: string;
}

/** Still open, and more than six hours past the promise. */
export function isStale(order: Promised, now: number): boolean {
  return readLateness(order.status, order.promised_at, now).isStale;
}

/**
 * The live queue without its stuck tickets — what every "waiting on you" list
 * and "past promised" count should be built from.
 */
export function excludeStale<T extends Promised>(orders: readonly T[], now: number): readonly T[] {
  return orders.filter((order) => !isStale(order, now));
}

/** Past the promise but not yet stuck: late food somebody can still save. */
export function isPastPromised(order: Promised, now: number): boolean {
  const late = readLateness(order.status, order.promised_at, now);
  return late.isLate && !late.isStale;
}

/**
 * Most urgent first.
 *
 * Urgency is not status order and it is not arrival order. A ticket somebody in
 * the kitchen can still act on outranks one already out for delivery, however
 * long ago that one was promised — there is nothing to press on an order in a
 * courier's hands. Within each group the most overdue is first.
 */
export function byUrgency<
  T extends { readonly status: OrderStatus; readonly promised_at: string },
>(orders: readonly T[], now: number): readonly T[] {
  return [...orders].sort((left, right) => {
    // Kitchen work, not "has a move": hand over and mark delivered are the
    // courier's moves the kitchen stands in for, and counting them made every
    // ticket rank as waiting on the cook.
    const leftActs = isKitchenWork(left.status) ? 0 : 1;
    const rightActs = isKitchenWork(right.status) ? 0 : 1;
    if (leftActs !== rightActs) return leftActs - rightActs;
    return (
      readLateness(right.status, right.promised_at, now).minutesLate -
      readLateness(left.status, left.promised_at, now).minutesLate
    );
  });
}
