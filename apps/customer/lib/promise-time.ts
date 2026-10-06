/**
 * The promised time, turned into something a customer can act on.
 *
 * The old tracking screen rendered `mm:ss` off the raw second count, so an
 * order thirteen hours past its promise read "781:41" — a number nobody can
 * use (DENSITY.md problem 4). Lateness is graded and written out instead:
 * "18m late", "13h 1m late", never a raw minute count above 90.
 *
 * `formatLate` and `lateTier` are the shared grading from @repo/ui, so the
 * customer's phone and the operator's board agree on what "well past due"
 * means. Everything here is pure: the caller owns the clock.
 */
import { formatLate, lateTier, type SeverityTier } from "@repo/ui";
import { formatMinutes, formatTimeOnly } from "./format";
import type { OrderEvent } from "./types";

const MS_PER_MINUTE = 60_000;

/**
 * Past this, a live order has stopped being "late" and become one that did not
 * arrive. Six hours is the edge of the shared grading's worst tier (lateTier 3,
 * "beyond six"): nobody is still waiting at the door for dinner at that point,
 * and a counter reading "44d 19h late" over "the kitchen is still on it" is a
 * claim the screen has no evidence for. The server never expires an order
 * (AD-2), so the customer app has to recognise one itself.
 *
 * Keyed on promised_at and the caller's clock only — never on a calendar date
 * or on how long ago the order was placed — so a fresh order 2h late keeps its
 * live meter, and seed data that is time-shifted later moves with it.
 */
export const STALE_LATE_MINUTES = 360;

/** Minutes past the promise; negative while it is still being kept. */
export function minutesPastPromise(promisedAt: string, now: Date): number {
  return (now.getTime() - toTime(promisedAt)) / MS_PER_MINUTE;
}

/**
 * True for an order that is still open on paper but is far enough past its
 * promise that it should be treated as failed: help first, no countdown.
 * A settled order is never stale — it got its answer.
 */
export function isLongOverdue({
  promisedAt,
  now,
  isSettled,
}: {
  readonly promisedAt: string;
  readonly now: Date;
  readonly isSettled: boolean;
}): boolean {
  if (isSettled) return false;
  const past = minutesPastPromise(promisedAt, now);
  return Number.isFinite(past) && past > STALE_LATE_MINUTES;
}

/**
 * When the order actually arrived, as the customer is shown it.
 *
 * The order row's `delivered_at` and the trail's "delivered" event are written
 * separately, and they disagree: the seeder stamps `delivered_at` at
 * promised_at ± a few minutes while the trail walks forward from placed_at, so
 * #664 read "Arrived 17:57 · 5 min after the promise" directly above a trail
 * saying Delivered 17:37. The trail is the record the screen prints, row by
 * row with who did it, so it wins; `delivered_at` is the fallback for an order
 * whose trail has no delivered row (or could not be read).
 *
 * The LAST delivered event, in case a status was ever re-recorded.
 */
export function resolveDeliveredAt(
  events: readonly OrderEvent[] | undefined,
  deliveredAt: string | null | undefined,
): string | null {
  const fromTrail = events
    ?.filter((event) => event.to_status === "delivered")
    .at(-1);
  return fromTrail?.created_at ?? deliveredAt ?? null;
}

/** What the meter is saying, which decides how loud the number is allowed to be. */
export type PromiseKind = "waiting" | "overdue" | "settled" | "unknown";

export interface PromiseInputs {
  /** When the order was placed — the left edge of the meter. */
  readonly placedAt: string;
  /** The right edge of the meter. */
  readonly promisedAt: string;
  readonly now: Date;
  readonly deliveredAt?: string | null;
  /** Delivered or cancelled: the meter stops moving and reports the outcome. */
  readonly isSettled: boolean;
}

export interface PromiseState {
  readonly kind: PromiseKind;
  /** 0 on time · 1 under an hour · 2 one to six hours · 3 beyond six. */
  readonly tier: SeverityTier;
  /** How much of the promised window has been used, 0–1. */
  readonly fill: number;
  /** The quiet lead-in above the number: "Arrives in". */
  readonly label: string;
  /** The loud part: "12 min", "18m late", "on time". */
  readonly value: string;
  /** One line, under the meter: what the promise actually was. */
  readonly caption: string;
}

function toTime(iso: string | null | undefined): number {
  if (iso === null || iso === undefined) return Number.NaN;
  return new Date(iso).getTime();
}

function clampFraction(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Grade one order against its promise.
 *
 * A settled order is measured against when it actually arrived, not against
 * the clock — a delivered order does not get later while you look at it.
 */
export function describePromise({
  placedAt,
  promisedAt,
  now,
  deliveredAt,
  isSettled,
}: PromiseInputs): PromiseState {
  const placed = toTime(placedAt);
  const promised = toTime(promisedAt);
  const delivered = toTime(deliveredAt);

  if (!Number.isFinite(promised)) {
    return {
      kind: "unknown",
      tier: 0,
      fill: 0,
      label: "Promised time",
      value: "—",
      caption: "The kitchen has not given a promised time for this order.",
    };
  }

  const settledAt = isSettled && Number.isFinite(delivered) ? delivered : now.getTime();
  const reference = isSettled ? settledAt : now.getTime();
  const minutesLate = (reference - promised) / MS_PER_MINUTE;
  const tier = lateTier(minutesLate);

  const window = promised - placed;
  const fill = window > 0 ? clampFraction((reference - placed) / window) : 1;

  const promisedClock = formatTimeOnly(promisedAt);

  if (isSettled) {
    return {
      kind: "settled",
      tier,
      fill,
      label: "Delivered",
      value: tier === 0 ? "on time" : `${formatLate(minutesLate)} late`,
      caption: arrivalLine(deliveredAt, promisedClock, minutesLate),
    };
  }

  if (minutesLate > 0) {
    return {
      kind: "overdue",
      tier,
      fill: 1,
      label: "Past the promised time",
      value: `${formatLate(minutesLate)} late`,
      caption: `promised by ${promisedClock}`,
    };
  }

  // Round up, so the last thirty seconds read "1 min" rather than "0 min".
  const minutesLeft = Math.max(Math.ceil(-minutesLate), 1);
  return {
    kind: "waiting",
    tier: 0,
    fill,
    label: "Arrives in",
    value: formatMinutes(minutesLeft),
    caption: `promised by ${promisedClock}`,
  };
}

/**
 * A settled order's one line: "Arrived 17:37 · 15 min before the promised
 * 17:52", or "Arrived 17:52 · on time". The meter and its "running late" grade are for an order still on
 * its way; once the food is on the table the lateness is a fact to state
 * quietly, not an alarm, so this is the whole of what a delivered order says.
 */
function arrivalLine(
  deliveredAt: string | null | undefined,
  promisedClock: string,
  minutesLate: number,
): string {
  if (deliveredAt === null || deliveredAt === undefined) {
    return `Promised by ${promisedClock}`;
  }
  const arrived = formatTimeOnly(deliveredAt);
  const gap = Math.round(Math.abs(minutesLate));
  if (gap === 0) return `Arrived ${arrived} · on time`;
  const direction = minutesLate > 0 ? "after" : "before";
  return `Arrived ${arrived} · ${formatMinutes(gap)} ${direction} the promised ${promisedClock}`;
}
