import * as React from "react";
import { cn } from "../lib/cn";
import { TONE_TEXT, type Tone } from "../status/tone";

/**
 * AutoScaleChart — a chart that scales to its data (DENSITY.md §7).
 *
 * The version this replaces ran its y-axis to 200 while nearly every daily
 * value was under 10, so the series drew a flat line along the floor. Here the
 * maximum is computed from the series on every render; there is no constant to
 * get wrong. The peak is labelled with its real value and its own x label, and
 * an all-zero series gets a sentence rather than a straight line that could be
 * mistaken for missing data.
 *
 * Plain SVG. No charting dependency — the whole thing is a polyline and a
 * polygon, and a library would bring a second colour system with it.
 */

export interface AutoChartPoint {
  /** X label: a date, an hour, a bucket name. Shown at the ends and the peak. */
  readonly label: string;
  readonly value: number;
}

export interface AutoScaleChartProps {
  /** Oldest first. */
  readonly points: readonly AutoChartPoint[];
  /** Read in place of the shape, e.g. "Refunds breached per day". */
  readonly ariaLabel: string;
  readonly tone?: Tone;
  /** Plot height in px. The labels sit outside it. */
  readonly height?: number;
  /** Money, percentages, anything with a unit. */
  readonly formatValue?: (value: number) => string;
  /** One line under the plot, always shown. */
  readonly caption?: string;
  /**
   * Shown instead of the plot when every value is zero. Say what zero means
   * here — "No refund breached its SLA in these 14 days" — never "No data".
   */
  readonly emptyCaption?: string;
  readonly className?: string;
}

/** Viewbox units. The SVG stretches to its container; strokes do not. */
const VB = 100;
const DEFAULT_HEIGHT = 128;
const MIN_POINTS = 2;

/** Round the axis top up to a readable number that still hugs the peak. */
const CEILING_STEPS: readonly number[] = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

function niceCeiling(peak: number): number {
  if (!Number.isFinite(peak) || peak <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(peak));
  const normalized = peak / magnitude;
  const step = CEILING_STEPS.find((candidate) => normalized <= candidate) ?? 10;
  return Number((step * magnitude).toPrecision(12));
}

function defaultFormat(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function AutoScaleChart({
  points,
  ariaLabel,
  tone = "accent",
  height = DEFAULT_HEIGHT,
  formatValue = defaultFormat,
  caption,
  emptyCaption,
  className,
}: AutoScaleChartProps): React.JSX.Element {
  const values = points.map((point) => point.value);
  const peakValue = values.length === 0 ? 0 : Math.max(...values);
  const total = values.reduce((sum, value) => sum + value, 0);

  if (points.length < MIN_POINTS || peakValue <= 0 || total <= 0) {
    return (
      <ChartShell
        ariaLabel={ariaLabel}
        height={height}
        caption={caption}
        className={className}
      >
        <FlatCaption
          text={
            emptyCaption ??
            (points.length < MIN_POINTS
              ? "Not enough history yet to draw a trend."
              : "Every value in this window is zero.")
          }
        />
      </ChartShell>
    );
  }

  const yMax = niceCeiling(peakValue);
  const peakIndex = values.indexOf(peakValue);
  const step = VB / (points.length - 1);

  const coords = values.map((value, index) => ({
    x: index * step,
    y: VB - (value / yMax) * VB,
  }));
  const line = coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
  const area = `0,${VB} ${line} ${VB},${VB}`;
  const peak = coords[peakIndex];
  const peakPoint = points[peakIndex];

  const firstLabel = points[0]?.label ?? "";
  const lastLabel = points[points.length - 1]?.label ?? "";

  return (
    <ChartShell
      ariaLabel={`${ariaLabel}. Peak ${formatValue(peakValue)} at ${peakPoint?.label ?? ""}, axis to ${formatValue(yMax)}.`}
      height={height}
      caption={caption}
      className={className}
      footer={
        <>
          <span className="font-mono text-[10px] text-ink-4">{firstLabel}</span>
          <span className="font-mono text-[10px] text-ink-4">{lastLabel}</span>
        </>
      }
    >
      <div className="relative h-full w-full">
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox={`0 0 ${VB} ${VB}`}
          preserveAspectRatio="none"
          className={cn("h-full w-full overflow-visible", TONE_TEXT[tone])}
        >
          <g className="text-line" strokeWidth={1} vectorEffect="non-scaling-stroke">
            <line x1="0" y1="0" x2={VB} y2="0" stroke="currentColor" strokeDasharray="3 3" />
            <line x1="0" y1={VB / 2} x2={VB} y2={VB / 2} stroke="currentColor" strokeDasharray="3 3" />
          </g>
          <polygon points={area} fill="currentColor" opacity={0.12} />
          <polyline
            points={line}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <g className="text-line-2">
            <line
              x1="0"
              y1={VB}
              x2={VB}
              y2={VB}
              stroke="currentColor"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>

        {/* Round marker in HTML: the SVG stretches horizontally, which would
            turn a circle into an ellipse. */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-chip",
            "ring-2 ring-surface",
            TONE_TEXT[tone],
          )}
          style={{
            left: `${peak?.x ?? 0}%`,
            top: `${peak?.y ?? 0}%`,
            background: "currentColor",
          }}
        />

        <span className="absolute top-0 left-0 -translate-y-1/2 bg-surface pr-1 font-mono text-[10px] text-ink-4 tabular-nums">
          {formatValue(yMax)}
        </span>
        <span
          className={cn(
            "absolute top-0 right-0 -translate-y-1/2 bg-surface pl-1 font-sans text-[10px] font-semibold tabular-nums",
            TONE_TEXT[tone],
          )}
        >
          peak {formatValue(peakValue)} · {peakPoint?.label}
        </span>
      </div>
    </ChartShell>
  );
}

interface ChartShellProps {
  readonly ariaLabel: string;
  readonly height: number;
  readonly caption?: string;
  readonly className?: string;
  readonly footer?: React.ReactNode;
  readonly children: React.ReactNode;
}

function ChartShell({
  ariaLabel,
  height,
  caption,
  className,
  footer,
  children,
}: ChartShellProps): React.JSX.Element {
  return (
    <figure
      role="img"
      aria-label={ariaLabel}
      className={cn("flex w-full flex-col gap-1.5", className)}
    >
      <div style={{ height }} className="w-full pt-2">
        {children}
      </div>
      {footer !== undefined ? (
        <div className="flex items-center justify-between">{footer}</div>
      ) : null}
      {caption !== undefined ? (
        <figcaption className="font-sans text-[11px] text-ink-3">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** An honest sentence where a flat line would have lied. */
function FlatCaption({ text }: { readonly text: string }): React.JSX.Element {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-card border border-dashed border-line px-4">
      <p className="text-center font-sans text-[12px] text-ink-3">{text}</p>
    </div>
  );
}
