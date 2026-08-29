/**
 * "Is this kitchen slipping?" — the one judgement two screens both make.
 *
 * A kitchen promises a delivery time built on the prep time it declares. When
 * its real end-to-end time drifts above that, every promise built on the old
 * figure runs late, and the live board fills up with orders nobody could have
 * delivered on time. The measure is the *gap*: how much longer an order really
 * takes than the kitchen says it needs.
 *
 * The gap is judged against the platform's own median rather than a fixed
 * number of minutes, so a slow evening everywhere does not flag all 25 at once.
 *
 * The overview shows the worst few; the restaurant page shows all of them. Both
 * read the grade from here so the two screens can never disagree.
 */
import type { SeverityTier } from "@repo/ui";
import type { RestaurantMetrics } from "./api-types";
import { median } from "./stats";

/** How far above the typical overhead a kitchen may sit before it is called
 *  out, and how far before it is the first thing to fix. */
export const WARN_MINUTES_OVER_MEDIAN = 8;
export const CRIT_MINUTES_OVER_MEDIAN = 20;

/** Real end-to-end time minus the prep time the kitchen promises on. */
export function gapMinutes(row: RestaurantMetrics): number | null {
  return row.avg_delivery_minutes === null
    ? null
    : row.avg_delivery_minutes - row.avg_prep_minutes;
}

export interface GapScale {
  /** The platform's typical overhead: pickup plus the ride. */
  readonly medianGap: number;
  readonly warnAt: number;
  readonly critAt: number;
}

export function gapScale(rows: readonly RestaurantMetrics[]): GapScale {
  const medianGap = median(
    rows.map(gapMinutes).filter((value): value is number => value !== null),
  );
  return {
    medianGap,
    warnAt: medianGap + WARN_MINUTES_OVER_MEDIAN,
    critAt: medianGap + CRIT_MINUTES_OVER_MEDIAN,
  };
}

/**
 * The same three-tier grade the boards use, on the scale a kitchen lives on.
 * Tier 2 is skipped: there are only two decisions here — leave it, or go and
 * fix the prep figure it promises on.
 */
export function divergenceTier(gap: number | null, scale: GapScale): SeverityTier {
  if (gap === null) return 0;
  if (gap >= scale.critAt) return 3;
  if (gap >= scale.warnAt) return 1;
  return 0;
}

/** Worst first, kitchens with no deliveries yet last. */
export function bySlippingFirst(
  left: RestaurantMetrics,
  right: RestaurantMetrics,
): number {
  return (gapMinutes(right) ?? Number.NEGATIVE_INFINITY) -
    (gapMinutes(left) ?? Number.NEGATIVE_INFINITY);
}
