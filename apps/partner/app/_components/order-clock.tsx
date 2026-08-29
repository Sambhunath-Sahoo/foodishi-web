import * as React from "react";
import { SEVERITY_TEXT, cn } from "@repo/ui";
import { formatClock, formatDuration, minutesSince } from "../_lib/format";
import { readLateness } from "../_lib/lateness";
import type { OrderStatus } from "../../lib/types";

export interface OrderClockProps {
  readonly status: OrderStatus;
  readonly placedAt: string;
  readonly promisedAt: string;
  readonly now: number;
  /** The detail screen runs the clock large; the queue keeps it compact. */
  readonly prominent?: boolean;
  readonly className?: string;
}

/**
 * Two facts, always both: how long this ticket has been sitting, and how it
 * stands against the promise the customer was given.
 *
 * The second fact is graded. "6h 32m late" and "3m late" no longer render the
 * same weight or the same hue (DENSITY.md §3), and neither is ever printed as
 * a raw minute count.
 */
export function OrderClock({
  status,
  placedAt,
  promisedAt,
  now,
  prominent = false,
  className,
}: OrderClockProps): React.JSX.Element {
  const waiting = formatDuration(minutesSince(placedAt, now));
  const late = readLateness(status, promisedAt, now);

  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-4 gap-y-0.5 font-mono tabular-nums",
        prominent ? "text-[15px]" : "text-[13px]",
        className,
      )}
    >
      {/* On a queue card the graded headline is already the loudest thing in
          the header; repeating it here would be noise. The detail screen has
          no such header, so it runs the headline large. */}
      {prominent ? (
        <span className={cn("text-[19px]", SEVERITY_TEXT[late.tier])}>
          {late.headline}
        </span>
      ) : null}
      <span className="text-ink-3">
        {late.detail} · placed {formatClock(placedAt)} · waiting {waiting}
      </span>
    </div>
  );
}
