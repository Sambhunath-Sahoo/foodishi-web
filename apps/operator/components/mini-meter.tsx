import * as React from "react";
import { cn, TONE_FILL, type Tone } from "@repo/ui";

export interface MiniMeterProps {
  readonly value: number;
  readonly max: number;
  /** The figure in words, always rendered — the bar alone is decoration. */
  readonly valueLabel: string;
  /** What the bar measures, for a screen reader. */
  readonly ariaLabel: string;
  readonly tone?: Tone;
  readonly className?: string;
}

const FULL_PERCENT = 100;
const PERCENT_PRECISION = 1;

/**
 * A proportion inside a 38px table row.
 *
 * `UsageBar` is the right control on a card, where a label line and a 6px
 * track have room. A Command Deck row does not have that room (DENSITY.md §2),
 * so this is the same idea at one third the height: a 6px track and the number
 * beside it, never the number replaced by the bar.
 */
export function MiniMeter({
  value,
  max,
  valueLabel,
  ariaLabel,
  tone = "accent",
  className,
}: MiniMeterProps): React.JSX.Element {
  const share = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  const percent = (share * FULL_PERCENT).toFixed(PERCENT_PRECISION);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="img"
        aria-label={`${ariaLabel}: ${valueLabel}`}
        className="h-1.5 w-20 shrink-0 overflow-hidden rounded-chip bg-surface-2"
      >
        <div
          className={cn("h-full rounded-chip", TONE_FILL[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="font-mono text-[11px] tabular-nums whitespace-nowrap text-ink-3">
        {valueLabel}
      </span>
    </div>
  );
}
