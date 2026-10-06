"use client";

import * as React from "react";
import { cn } from "@repo/ui";

/**
 * The heart. A toggle button, so a screen reader announces the state rather
 * than the icon — and the label says which kitchen or dish, because a page can
 * hold twenty of these.
 */
export function FavoriteButton({
  isSaved,
  subject,
  onToggle,
  size = "md",
  className,
}: {
  readonly isSaved: boolean;
  /** What is being saved, e.g. "Curry Leaf Kitchen". */
  readonly subject: string;
  readonly onToggle: () => void;
  /**
   * "corner" sits on a dish photo: a 32px disc drawn inside the same 44px
   * target, so the photo is not half-covered by a heart and the tap still
   * lands.
   */
  readonly size?: "sm" | "md" | "corner";
  readonly className?: string;
}): React.JSX.Element {
  // Both sizes are a 44px target — "sm" only draws a smaller heart. A 36px
  // circle beside a card link is the easiest thing on the page to miss, and a
  // missed heart opens the kitchen instead of saving it.
  const box = size === "sm" ? "h-11 w-11 text-[15px]" : "h-11 w-11 text-[18px]";
  const label = isSaved ? `Remove ${subject} from favourites` : `Save ${subject} to favourites`;

  if (size === "corner") {
    return (
      <button
        type="button"
        aria-pressed={isSaved}
        aria-label={label}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggle();
        }}
        className={cn(
          "group inline-flex size-11 shrink-0 items-center justify-center rounded-chip",
          "focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-accent",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-chip border text-[15px] leading-none shadow-card transition-colors",
            isSaved
              ? "border-crit/30 bg-crit-soft text-crit"
              : "border-line bg-surface text-ink-3 group-hover:text-ink-2",
          )}
        >
          {isSaved ? "♥" : "♡"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={isSaved}
      aria-label={label}
      onClick={(event) => {
        // These sit inside a <Link> card: saving must not navigate.
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-chip border",
        "leading-none transition-colors",
        box,
        isSaved
          ? "border-crit/30 bg-crit-soft text-crit"
          : "border-line bg-surface text-ink-3 hover:text-ink-2",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      <span aria-hidden="true">{isSaved ? "♥" : "♡"}</span>
    </button>
  );
}
