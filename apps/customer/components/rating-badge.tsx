import * as React from "react";
import { Badge, cn, type Tone } from "@repo/ui";
import { formatRating, isUnrated } from "../lib/format";

/**
 * A kitchen's star rating, or "New" when nobody has rated it yet.
 *
 * Every screen that shows a kitchen's rating goes through here so the 0.0 rule
 * lives in one place (see isUnrated). "New" is deliberately mute, not ok-green:
 * DESIGN.md keeps green for delivered, veg and available, and an unrated kitchen
 * is none of those — it is simply not scored yet.
 */
export function RatingBadge({
  rating,
  ratingCount,
  tone = "ok",
  showCount = false,
  className,
}: {
  readonly rating: string | number;
  /** Omit when unknown (saved favourites only kept the average). */
  readonly ratingCount?: number;
  /** The tone of a real score. "New" is always mute. */
  readonly tone?: Tone;
  /** Append "· 12" — the number of ratings behind the average. */
  readonly showCount?: boolean;
  readonly className?: string;
}): React.JSX.Element {
  if (isUnrated(rating, ratingCount)) {
    return (
      <Badge tone="mute" dot={false} className={cn("shrink-0", className)}>
        New<span className="sr-only">, not rated yet</span>
      </Badge>
    );
  }

  return (
    // The rating is a number, so it gets tabular figures like money.
    <Badge
      tone={tone}
      dot={false}
      className={cn("shrink-0 font-semibold tabular-nums", className)}
    >
      <span aria-hidden="true">★</span>
      <span className="sr-only">Rated</span>
      {formatRating(rating)}
      {showCount && ratingCount !== undefined
        ? ` · ${ratingCount.toLocaleString()}`
        : null}
    </Badge>
  );
}
