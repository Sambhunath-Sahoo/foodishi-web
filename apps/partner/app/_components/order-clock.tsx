import * as React from "react";
import { SEVERITY_TEXT, cn } from "@repo/ui";
import { formatClock, formatDuration, minutesSince } from "../_lib/format";
import { readLateness } from "../_lib/lateness";
import { SETTLED_STATUSES } from "../../lib/order-flow";
import type { OrderStatus } from "../../lib/types";

/**
 * What a settled order's line leads with. There is no "rejected" status: a
 * kitchen's rejection lands as `cancelled`, with its reason beside it.
 */
const OUTCOME_LABELS: Partial<Record<OrderStatus, string>> = {
  delivered: "Delivered",
  cancelled: "Cancelled",
};

interface Settles {
  readonly status: OrderStatus;
  readonly delivered_at: string | null;
  readonly cancelled_at: string | null;
}

/** The stamp that matches how the order ended, so a caller never picks the wrong one. */
export function settledAtOf(order: Settles): string | null {
  if (order.status === "delivered") return order.delivered_at;
  if (order.status === "cancelled") return order.cancelled_at;
  return null;
}

export interface OrderClockProps {
  readonly status: OrderStatus;
  readonly placedAt: string;
  readonly promisedAt: string;
  /**
   * When a settled order settled: `delivered_at` or `cancelled_at`. Null on a
   * live ticket, and on an old settled row the API never stamped.
   */
  readonly settledAt?: string | null;
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
  settledAt = null,
  now,
  prominent = false,
  className,
}: OrderClockProps): React.JSX.Element {
  const late = readLateness(status, promisedAt, now);
  const line = SETTLED_STATUSES.has(status)
    ? describeOutcome(status, placedAt, settledAt, now)
    : describeWait(placedAt, late.detail, now);

  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-4 gap-y-0.5 font-mono tabular-nums",
        prominent ? "text-[15px]" : "text-[13px] leading-4",
        className,
      )}
    >
      {/* On a queue card the graded headline is already the loudest thing in
          the header; repeating it here would be noise. The detail screen has
          no such header, so it runs the headline large. */}
      {/* A settled order is finished, not "on time": tier 0's green would call
          a cancellation good news. It names the outcome in plain ink and leaves
          colour to the status chip, which means one thing per tone. */}
      {prominent ? (
        <span
          className={cn(
            "text-[19px]",
            SETTLED_STATUSES.has(status) ? "text-ink" : SEVERITY_TEXT[late.tier],
          )}
        >
          {SETTLED_STATUSES.has(status) ? (OUTCOME_LABELS[status] ?? late.headline) : late.headline}
        </span>
      ) : null}
      {/* One line on a queue card. Truncated rather than wrapped if a narrow
          column ever runs out of room, with the whole sentence on hover. */}
      <span className={cn("text-ink-3", !prominent && "min-w-0 truncate leading-4")} title={line}>
        {line}
      </span>
    </div>
  );
}

/**
 * A live ticket: how long it has sat, and the promise.
 *
 * The wait first: once a clock carries its date ("21 Aug, 20:26") the line
 * outgrows a narrow column, and what truncation cuts must be the placed-at
 * clock that "waiting" already implies, never the wait itself.
 */
function describeWait(placedAt: string, promiseDetail: string, now: number): string {
  const waiting = formatDuration(minutesSince(placedAt, now));
  const promise = promiseDetail.charAt(0).toLowerCase() + promiseDetail.slice(1);
  return `Waiting ${waiting} · ${promise} · placed ${formatClock(placedAt, now)}`;
}

/**
 * A settled order: what happened, when, and how long after placing.
 *
 * Nobody is waiting on a delivered order. "Waiting 44d 3h" on one read as a
 * customer still standing at the door, so the span is measured to the moment
 * it settled, never to now. Without that moment the outcome stands alone
 * rather than borrowing a clock that would lie.
 */
function describeOutcome(
  status: OrderStatus,
  placedAt: string,
  settledAt: string | null,
  now: number,
): string {
  const outcome = OUTCOME_LABELS[status] ?? "Closed";
  const settled = settledAt === null ? Number.NaN : new Date(settledAt).getTime();
  if (settledAt === null || Number.isNaN(settled)) {
    return `${outcome} · placed ${formatClock(placedAt, now)}`;
  }
  const took = formatDuration(minutesSince(placedAt, settled));
  return `${outcome} ${formatClock(settledAt, now)} · ${took} after placing`;
}
