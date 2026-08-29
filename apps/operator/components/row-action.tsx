"use client";

import * as React from "react";
import { cn } from "@repo/ui";

export interface RowActionProps {
  readonly children: React.ReactNode;
  readonly onClick: () => void;
  readonly isPending?: boolean;
  readonly disabled?: boolean;
  /** Danger reads in `--crit`; it is still an outline, never a filled block. */
  readonly tone?: "default" | "accent" | "danger";
  /** Why it is disabled, or what it will do. Always worth saying. */
  readonly title?: string;
  readonly ariaLabel?: string;
}

const TONE_CLASS: Readonly<Record<NonNullable<RowActionProps["tone"]>, string>> = {
  default: "border-line-2 text-ink-2 hover:bg-surface-2 hover:text-ink",
  accent: "border-accent/40 text-accent hover:bg-accent-soft",
  danger: "border-crit/40 text-crit hover:bg-crit-soft",
};

/**
 * A button that fits inside a 38px row.
 *
 * `Button` at `size="sm"` is 32px tall with 12px of side padding, which is right
 * on a card and eats the row on a Command Deck table (DENSITY.md §2). This is
 * the same affordance at 24px: the same focus ring, the same disabled
 * behaviour, the same pending lock, in the height a dense row can spare.
 *
 * It stops click propagation, because every board this appears on opens a
 * drawer when the row is clicked — an action that also opened the drawer behind
 * itself would be a bug on every single row.
 */
export function RowAction({
  children,
  onClick,
  isPending = false,
  disabled = false,
  tone = "default",
  title,
  ariaLabel,
}: RowActionProps): React.JSX.Element {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      aria-busy={isPending || undefined}
      disabled={disabled || isPending}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-card border px-2",
        "font-sans text-[11px] font-medium whitespace-nowrap transition-colors",
        "cursor-pointer disabled:pointer-events-none disabled:opacity-45",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
        TONE_CLASS[tone],
      )}
    >
      {isPending ? "…" : children}
    </button>
  );
}

/** The gap between two row actions, so no board invents its own. */
export function RowActions({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return <span className="flex items-center justify-end gap-1.5">{children}</span>;
}
