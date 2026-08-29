import * as React from "react";
import { SEVERITY_LABEL, SEVERITY_TEXT, cn, type SeverityTier } from "@repo/ui";
import type { PromiseState } from "../lib/promise-time";

/**
 * Solid bar fill per severity tier.
 *
 * @repo/ui exports the stripe, the text colour and the soft ground for a tier
 * but not a bar fill, and Tailwind only emits classes it can read as literal
 * text — a `bg-${tone}` assembled at runtime never reaches the stylesheet. So
 * the four classes are written out here in full. Every one is a token-backed
 * utility from `styles/theme.css`; there is no colour value in this file.
 *
 * Tier 0 is the accent rather than green: while the promise is still being
 * kept, the meter is structure, not a verdict.
 */
const TIER_FILL: Record<SeverityTier, string> = {
  0: "bg-accent",
  1: "bg-warn",
  2: "bg-burnt",
  3: "bg-crit",
};

const PERCENT = 100;

/**
 * The promise, as a filling meter.
 *
 * The number is the loudest thing on the tracking screen and it is graded:
 * "18m late" and "13h 1m late" cannot render the same way (DENSITY.md §3).
 * The bar repeats the same grade, and the words beside it repeat it again, so
 * nothing here rests on colour alone (DESIGN.md non-negotiable #3).
 */
export function PromiseMeter({
  state,
  className,
}: {
  readonly state: PromiseState;
  readonly className?: string;
}): React.JSX.Element {
  const percent = Math.round(state.fill * PERCENT);
  const isGraded = state.tier > 0;
  const valueClass =
    isGraded
      ? SEVERITY_TEXT[state.tier]
      : state.kind === "settled"
        ? "text-ok"
        : "text-ink";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
            {state.label}
          </p>
          <p
            aria-live="polite"
            className={cn(
              "mt-1 text-[26px] leading-none font-semibold tabular-nums",
              valueClass,
            )}
          >
            {state.value}
          </p>
        </div>
        <p className="shrink-0 pb-1 text-right font-mono text-[12px] tabular-nums text-ink-3">
          {state.caption}
        </p>
      </div>

      <div
        role="progressbar"
        aria-label="Time used against the promised delivery time"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={PERCENT}
        aria-valuetext={`${state.label} ${state.value}`}
        className="h-2 w-full overflow-hidden rounded-chip bg-surface-2"
      >
        <div
          className={cn("h-full rounded-chip", TIER_FILL[state.tier])}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* The grade in words. Without it the bar is a colour and nothing more. */}
      {isGraded ? (
        <p className={cn("text-[13px]", SEVERITY_TEXT[state.tier])}>
          {SEVERITY_LABEL[state.tier]}
        </p>
      ) : null}
    </div>
  );
}
