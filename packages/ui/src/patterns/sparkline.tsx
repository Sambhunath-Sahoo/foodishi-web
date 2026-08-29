import * as React from "react";
import type { Tone } from "../status/tone";

export interface SparklineProps {
  /** Oldest first. Twelve five-minute buckets is what the board sends. */
  readonly points: readonly number[];
  /** Read by screen readers in place of the shape, e.g. "7 breaches, rising". */
  readonly label: string;
  readonly tone?: Tone;
  readonly width?: number;
  readonly height?: number;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

function toPoints(
  values: readonly number[],
  width: number,
  height: number,
): readonly Point[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min === 0 ? 1 : max - min;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const inset = 2;
  const usable = height - inset * 2;
  return values.map((value, index) => ({
    x: index * step,
    y: height - inset - ((value - min) / span) * usable,
  }));
}

/**
 * A trend, not a chart: no axes, no grid, no tooltip. It inherits `color` from
 * its tone class, so the KPI tile decides the token and the shape follows.
 */
export function Sparkline({
  points,
  label,
  tone = "accent",
  width = 104,
  height = 30,
}: SparklineProps): React.JSX.Element | null {
  const coords = toPoints(points, width, height);
  const last = coords[coords.length - 1];
  if (last === undefined) return null;

  const line = coords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg
      role="img"
      aria-label={label}
      className={`tp-tone-${tone}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <polygon points={area} fill="currentColor" opacity={0.14} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last.x} cy={last.y} r={2.5} fill="currentColor" />
    </svg>
  );
}
