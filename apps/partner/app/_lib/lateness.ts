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
import { formatClock, minutesSince, minutesUntil } from "./format";
// A finished ticket is never late, however long ago it was promised — and what
// counts as finished is the order machine's answer, not a local list.
import { SETTLED_STATUSES, hasKitchenDecision } from "../../lib/order-flow";
import type { OrderStatus } from "../../lib/types";

export interface Lateness {
  /** Whole minutes past the promise. Zero or negative means still in time. */
  readonly minutesLate: number;
  /** 0 on time · 1 under an hour · 2 one to six hours · 3 beyond six. */
  readonly tier: SeverityTier;
  readonly isLate: boolean;
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
  const promise = formatClock(promisedAt);

  if (SETTLED_STATUSES.has(status)) {
    return {
      minutesLate: 0,
      tier: 0,
      isLate: false,
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
    headline: `${formatLate(minutesLate)} late`,
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
    const leftActs = hasKitchenDecision(left.status) ? 0 : 1;
    const rightActs = hasKitchenDecision(right.status) ? 0 : 1;
    if (leftActs !== rightActs) return leftActs - rightActs;
    return (
      readLateness(right.status, right.promised_at, now).minutesLate -
      readLateness(left.status, left.promised_at, now).minutesLate
    );
  });
}
