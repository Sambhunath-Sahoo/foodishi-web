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
  readonly size?: "sm" | "md";
  readonly className?: string;
}): React.JSX.Element {
  const box = size === "sm" ? "h-9 w-9 text-[15px]" : "h-11 w-11 text-[18px]";

  return (
    <button
      type="button"
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${subject} from favourites` : `Save ${subject} to favourites`}
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
          : "border-line bg-surface text-ink-4 hover:text-ink-2",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      <span aria-hidden="true">{isSaved ? "♥" : "♡"}</span>
    </button>
  );
}
