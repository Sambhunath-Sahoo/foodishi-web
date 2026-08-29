import * as React from "react";
import { cn } from "../lib/cn";
import { TONE_FILL, type Tone } from "../status/tone";

export interface UsageBarProps {
  readonly value: number;
  readonly max: number;
  readonly label: string;
  /**
   * Shown beside the label — the real number, not just a bar.
   * Colour never carries meaning alone.
   */
  readonly valueLabel?: string;
  readonly tone?: Tone;
  readonly className?: string;
}

/** A coupon's redemption count, an SLA budget, a restaurant's capacity. */
export function UsageBar({
  value,
  max,
  label,
  valueLabel,
  tone = "accent",
  className,
}: UsageBarProps): React.JSX.Element {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-sans text-[13px] text-ink-2">{label}</span>
        <span className="font-mono text-[12px] tabular-nums text-ink-3">
          {valueLabel ?? `${value} / ${max}`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-1.5 w-full overflow-hidden rounded-chip bg-surface-2"
      >
        <div
          className={cn("h-full rounded-chip", TONE_FILL[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
