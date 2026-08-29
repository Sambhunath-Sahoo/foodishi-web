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

const MS_PER_MINUTE = 60_000;

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
    const arrived =
      deliveredAt === null || deliveredAt === undefined
        ? undefined
        : formatTimeOnly(deliveredAt);
    return {
      kind: "settled",
      tier,
      fill,
      label: arrived === undefined ? "Promised by" : "Delivered",
      value: tier === 0 ? "on time" : `${formatLate(minutesLate)} late`,
      caption:
        arrived === undefined
          ? `promised by ${promisedClock}`
          : `arrived ${arrived} · promised ${promisedClock}`,
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
