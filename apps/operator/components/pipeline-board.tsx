"use client";

import * as React from "react";
import Link from "next/link";
import { cn, StatusChip } from "@repo/ui";
import { formatCount } from "../lib/format";
import type { OrderStatus, StatusCount } from "../lib/api-types";

/**
 * Where every live order on the platform is right now, as four numbers big
 * enough to read across a room.
 *
 * The operator's counterpart to the partner app's `ServiceBoard`, and
 * deliberately the same shape: same 34px count, same status chip, same
 * urgent-only tint, same "one more line underneath rather than a fifth cell".
 * Two people looking at the same platform from two consoles should not have to
 * learn two visual languages for the same fact.
 *
 * What differs is the scope and therefore what counts as urgent. A kitchen cares
 * that ITS ticket is unanswered; the platform cares that a queue is building
 * somewhere it cannot see — an order nobody has accepted, and food going cold on
 * a pass with no rider coming for it. Those two are the loud cells here.
 *
 * Every cell is a link into the orders board already filtered to that status. A
 * number nobody can act on is decoration.
 */
interface Stage {
  readonly status: OrderStatus;
  readonly label: string;
  /** What the reader is supposed to do about a non-zero count. */
  readonly caption: string;
  /** Loud only while it means somebody is waiting on the platform. */
  readonly urgent: boolean;
}

const STAGES: readonly Stage[] = [
  {
    status: "pending",
    label: "Not accepted",
    caption: "No kitchen has taken these on",
    urgent: true,
  },
  {
    status: "preparing",
    label: "In a kitchen",
    caption: "Being cooked now",
    urgent: false,
  },
  {
    status: "ready_for_pickup",
    label: "On the pass",
    caption: "Cooked, waiting for a rider",
    urgent: true,
  },
  {
    status: "out_for_delivery",
    label: "On the road",
    caption: "With a rider now",
    urgent: false,
  },
];

export interface PipelineBoardProps {
  /** The funnel's per-status counts. For a live status this IS the live count. */
  readonly statuses: readonly StatusCount[] | undefined;
  /** Accepted but not started — the fifth stage, carried in the line below. */
  readonly confirmed: number | undefined;
  /** Live orders already past the time the customer was told. */
  readonly late: number | undefined;
}

export function PipelineBoard({
  statuses,
  confirmed,
  late,
}: PipelineBoardProps): React.JSX.Element {
  const counts = React.useMemo(() => {
    const tally = new Map<string, number>();
    for (const row of statuses ?? []) tally.set(row.status, row.order_count);
    return tally;
  }, [statuses]);

  const isLoaded = statuses !== undefined;

  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAGES.map((stage) => {
          const count = counts.get(stage.status) ?? 0;
          const isLoud = stage.urgent && count > 0;

          return (
            <Link
              key={stage.status}
              href={`/orders?status=${stage.status}`}
              className={cn(
                "flex min-h-[104px] flex-col justify-between gap-2 rounded-card border p-4",
                "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                isLoud
                  ? "border-warn/30 bg-warn-soft"
                  : "border-line bg-surface hover:bg-surface-2",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-[10px] leading-none font-bold tracking-[0.09em] uppercase",
                    isLoud ? "text-warn" : "text-ink-3",
                  )}
                >
                  {stage.label}
                </span>
                <StatusChip status={stage.status} />
              </span>
              <span
                className={cn(
                  "font-sans text-[34px] leading-none font-semibold tabular-nums",
                  isLoud ? "text-warn" : "text-ink",
                )}
              >
                {isLoaded ? formatCount(count) : "—"}
              </span>
              <span
                className={cn(
                  "text-[12px] leading-snug",
                  isLoud ? "text-warn" : "text-ink-3",
                )}
              >
                {stage.caption}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Not a fifth and sixth cell. "Accepted, not started" needs nobody to do
          anything, and the late count belongs beside the work rather than
          competing with it for the loudest number on the page — the rail below
          carries the alarm. */}
      <p className="text-[13px] text-ink-3">
        {isLoaded && confirmed !== undefined ? (
          <>
            <span className="font-medium text-ink-2">{formatCount(confirmed)}</span>{" "}
            accepted and not started yet
            {late !== undefined && late > 0 ? (
              <>
                {" · "}
                <Link
                  href="/live"
                  className="font-medium text-crit underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {formatCount(late)} past the time they were promised
                </Link>
              </>
            ) : (
              " · every live order is inside its promise"
            )}
          </>
        ) : (
          "Counting live orders…"
        )}
      </p>
    </div>
  );
}
