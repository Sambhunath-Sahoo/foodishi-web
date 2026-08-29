import * as React from "react";
import { cn } from "../lib/cn";

/**
 * StatRail — the replacement for a grid of KPI cards (DENSITY.md §1).
 *
 * Five 150px cards with a paragraph inside meant "22 breached SLAs" read no
 * louder than "25 restaurants". A rail is one 60px band: a 10px tracked label,
 * a 20–24px tabular number, one line of caption. Cells are divided by a 1px
 * rule, never by a gutter, and the rail scrolls sideways inside its own border
 * on a narrow screen rather than reflowing into a second row of cards.
 *
 * At most one or two cells take `tone="alarm"`. If everything is loud, nothing
 * is.
 */

/** `alarm` is the only tone that changes the cell's ground. */
export type StatTone = "default" | "ok" | "warn" | "alarm";

/* Static maps: Tailwind scans source text, so a runtime-built class never
   reaches the stylesheet. */

const STAT_GROUND: Record<StatTone, string> = {
  default: "bg-surface",
  ok: "bg-surface",
  warn: "bg-surface",
  alarm: "bg-crit-soft",
};

const STAT_VALUE: Record<StatTone, string> = {
  default: "text-ink",
  ok: "text-ok",
  warn: "text-warn",
  alarm: "text-crit",
};

const STAT_LABEL: Record<StatTone, string> = {
  default: "text-ink-3",
  ok: "text-ink-3",
  warn: "text-warn",
  alarm: "text-crit",
};

const STAT_CAPTION: Record<StatTone, string> = {
  default: "text-ink-3",
  ok: "text-ink-3",
  warn: "text-ink-3",
  alarm: "text-crit",
};

export interface StatRailProps extends React.HTMLAttributes<HTMLDListElement> {
  /** Names the rail for screen readers, e.g. "Platform health". */
  readonly ariaLabel: string;
}

export function StatRail({
  ariaLabel,
  className,
  children,
  ...props
}: StatRailProps): React.JSX.Element {
  return (
    <div className="w-full max-w-full overflow-x-auto rounded-card border border-line">
      <dl
        aria-label={ariaLabel}
        className={cn("flex w-full divide-x divide-line", className)}
        {...props}
      >
        {children}
      </dl>
    </div>
  );
}

export interface StatProps {
  /** 10px uppercase, tracked. Two or three words at most. */
  readonly label: string;
  /** The number. Pre-formatted — the rail does not know about currency. */
  readonly value: React.ReactNode;
  /** Exactly one line. Anything longer belongs in `hint`. */
  readonly caption?: string;
  /** The paragraph that used to sit inside the card, as a hover tooltip. */
  readonly hint?: string;
  readonly tone?: StatTone;
  /** Oldest first. A trend, not a chart — no axes, no ticks, no tooltip. */
  readonly spark?: readonly number[];
  readonly className?: string;
}

export function Stat({
  label,
  value,
  caption,
  hint,
  tone = "default",
  spark,
  className,
}: StatProps): React.JSX.Element {
  return (
    <div
      title={hint}
      className={cn(
        "flex h-[60px] min-w-[136px] flex-1 shrink-0 flex-col justify-center gap-[3px] px-3.5",
        STAT_GROUND[tone],
        className,
      )}
    >
      <dt
        className={cn(
          "text-[10px] leading-none font-bold tracking-[0.09em] uppercase",
          STAT_LABEL[tone],
        )}
      >
        {label}
      </dt>
      <dd className="m-0 flex items-end justify-between gap-2">
        <span
          className={cn(
            "font-sans text-[22px] leading-none font-semibold tabular-nums",
            STAT_VALUE[tone],
          )}
        >
          {value}
        </span>
        {spark !== undefined && spark.length > 1 ? (
          <StatSpark points={spark} className={STAT_VALUE[tone]} />
        ) : null}
      </dd>
      {caption !== undefined ? (
        <p
          className={cn(
            "truncate text-[11px] leading-[14px]",
            STAT_CAPTION[tone],
          )}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}

const SPARK_WIDTH = 54;
const SPARK_HEIGHT = 16;
const SPARK_INSET = 2;

interface StatSparkProps {
  readonly points: readonly number[];
  readonly className?: string;
}

/**
 * A plain polyline in `currentColor`, aria-hidden: the label and the number
 * already say everything, so the shape adds texture and no obligation. No
 * charting dependency — DENSITY.md §7 wants honesty, not a library.
 */
function StatSpark({ points, className }: StatSparkProps): React.JSX.Element {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min === 0 ? 1 : max - min;
  const step = SPARK_WIDTH / (points.length - 1);
  const usable = SPARK_HEIGHT - SPARK_INSET * 2;

  const line = points
    .map((value, index) => {
      const x = index * step;
      const y = SPARK_HEIGHT - SPARK_INSET - ((value - min) / span) * usable;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={SPARK_WIDTH}
      height={SPARK_HEIGHT}
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      className={cn("shrink-0 opacity-70", className)}
    >
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
