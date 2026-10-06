"use client";

import * as React from "react";
import { cn, TONE_SOFT, type Tone } from "@repo/ui";
import { formatCount } from "../lib/format";

/**
 * A page's state filter, as the board it always should have been.
 *
 * Every list in this console had the same two things stacked on top of each
 * other: a segmented control naming the states, and a rail counting some of
 * them. The control knew the names and not the numbers; the rail knew some
 * numbers and could not be clicked. So the reader had to tap each segment to
 * find out whether anything was in it — polling a filter by hand.
 *
 * These are the same states as one row of cards that carry their own count and
 * ARE the filter. The card you are looking at is the card you press.
 *
 * Where this does NOT go: a page whose main content is a dense board. The
 * height a card row costs is height the rows needed, and packages/ui/DENSITY.md
 * records that measured on this product — the live board once burned ~450px on
 * four cards above five columns. So this is for the pages whose lists are short
 * enough to spare it, and the long boards keep their toolbar.
 */
export interface Stage<TValue extends string> {
  readonly value: TValue;
  /** Two or three words, uppercase in the card. */
  readonly label: string;
  /** What the reader is meant to do about a non-zero count. One line. */
  readonly caption: string;
  /** Undefined while the counts are still in flight. */
  readonly count: number | undefined;
  /**
   * The tone this stage takes ONCE its count is non-zero. A stage that is loud
   * at zero teaches the reader that the colour means nothing.
   */
  readonly tone?: Extract<Tone, "warn" | "crit">;
  /** A chip naming the state in the platform's own words. Optional. */
  readonly chip?: React.ReactNode;
}

export interface StageCardsProps<TValue extends string> {
  readonly stages: readonly Stage<TValue>[];
  /**
   * Which cards read as selected: the one the reader pressed, or none.
   *
   * Pass `[]` when no card is applied as a filter — including a page's default
   * view. Callers used to ring every card when nothing was chosen (4/4 on
   * Offers, 5/5 on Payments), and a ring on everything is a ring on nothing: it
   * could not tell the reader which card they had pressed, because they had
   * not pressed one (OP-6). What the unfiltered table shows is said in `note`.
   * Still a list so a caller can ring a genuine multi-stage selection.
   */
  readonly active: readonly TValue[];
  readonly onSelect: (value: TValue) => void;
  /** Names the group for a screen reader, e.g. "Which rides to show". */
  readonly ariaLabel: string;
  /**
   * One line under the row for the facts that did not earn a card — a stage
   * nobody acts on, a total, a caveat.
   */
  readonly note?: React.ReactNode;
}

const LOUD_RING: Readonly<Record<"warn" | "crit", string>> = {
  warn: "border-warn/30 bg-warn-soft",
  crit: "border-crit/30 bg-crit-soft",
};

const LOUD_TEXT: Readonly<Record<"warn" | "crit", string>> = {
  warn: "text-warn",
  crit: "text-crit",
};

export function StageCards<TValue extends string>({
  stages,
  active,
  onSelect,
  ariaLabel,
  note,
}: StageCardsProps<TValue>): React.JSX.Element {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          "grid gap-3 grid-cols-2",
          stages.length === 3 && "lg:grid-cols-3",
          stages.length === 4 && "lg:grid-cols-4",
          stages.length >= 5 && "lg:grid-cols-5",
        )}
      >
        {stages.map((stage) => {
          const isSelected = active.includes(stage.value);
          const isLoud = stage.tone !== undefined && (stage.count ?? 0) > 0;

          return (
            <button
              key={stage.value}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelect(stage.value)}
              className={cn(
                "flex min-h-[102px] cursor-pointer flex-col justify-between gap-2",
                "rounded-card border p-4 text-left transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                isLoud && stage.tone !== undefined
                  ? LOUD_RING[stage.tone]
                  : "border-line bg-surface hover:bg-surface-2",
                // The selected card takes the accent ring rather than a fill:
                // a loud stage is already carrying its own colour, and two
                // backgrounds fighting would lose the severity.
                isSelected && "ring-2 ring-accent ring-inset",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-[10px] leading-none font-bold tracking-[0.09em] uppercase",
                    isLoud && stage.tone !== undefined
                      ? LOUD_TEXT[stage.tone]
                      : "text-ink-3",
                  )}
                >
                  {stage.label}
                </span>
                {stage.chip}
              </span>
              <span
                className={cn(
                  "font-sans text-[34px] leading-none font-semibold tabular-nums",
                  isLoud && stage.tone !== undefined
                    ? LOUD_TEXT[stage.tone]
                    : "text-ink",
                )}
              >
                {stage.count === undefined ? "—" : formatCount(stage.count)}
              </span>
              <span
                className={cn(
                  "text-[12px] leading-snug",
                  isLoud && stage.tone !== undefined
                    ? LOUD_TEXT[stage.tone]
                    : "text-ink-3",
                )}
              >
                {stage.caption}
              </span>
            </button>
          );
        })}
      </div>

      {note === undefined ? null : (
        <p className="text-[13px] text-ink-3">{note}</p>
      )}
    </div>
  );
}

/** A quiet chip for a state the design system has no `StatusChip` for. */
export function StageChip({
  tone = "mute",
  children,
}: {
  readonly tone?: Tone;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5",
        "font-sans text-[12px] font-medium whitespace-nowrap",
        TONE_SOFT[tone],
      )}
    >
      {children}
    </span>
  );
}
