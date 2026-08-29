"use client";

import * as React from "react";
import Link from "next/link";
import { StatusChip, cn } from "@repo/ui";
import { formatCount } from "../_lib/format";
import { HANDOVER_STATUSES } from "../../lib/order-flow";
import type { Order, OrderStatus } from "../../lib/types";

/**
 * Where every live ticket is right now, as four numbers big enough to read from
 * across a kitchen.
 *
 * This is the whole of a shift worker's dashboard and the top of a manager's,
 * because it answers the only question service actually has: what is waiting on
 * me. Each cell is a link into the orders board already filtered to that
 * status — a number nobody can act on is decoration.
 *
 * Deliberately not a `StatRail`. The rail is a 60px band of small numbers for
 * somebody reading at a desk; this is read at two feet with both hands full, so
 * the count runs at 34px and the whole cell is the tap target.
 */
interface Cell {
  readonly status: OrderStatus;
  readonly label: string;
  /** What the person reading it is supposed to do about a non-zero count. */
  readonly caption: string;
  /** Loud only while it means somebody is waiting on an answer. */
  readonly urgent: boolean;
}

const CELLS: readonly Cell[] = [
  {
    status: "pending",
    label: "Not answered",
    caption: "A customer is waiting to hear back",
    urgent: true,
  },
  {
    status: "confirmed",
    label: "Accepted",
    caption: "Taken on, not started",
    urgent: false,
  },
  {
    status: "preparing",
    label: "In the kitchen",
    caption: "Being cooked now",
    urgent: false,
  },
  {
    status: "ready_for_pickup",
    label: "Ready",
    caption: "Cooked, waiting to go out",
    urgent: true,
  },
];

export function ServiceBoard({
  orders,
  isLoaded,
}: {
  readonly orders: readonly Order[];
  readonly isLoaded: boolean;
}): React.JSX.Element {
  const counts = React.useMemo(() => {
    const tally = new Map<OrderStatus, number>();
    for (const order of orders) {
      tally.set(order.status, (tally.get(order.status) ?? 0) + 1);
    }
    return tally;
  }, [orders]);

  const outForDelivery = orders.filter((order) =>
    HANDOVER_STATUSES.has(order.status),
  ).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CELLS.map((cell) => {
          const count = counts.get(cell.status) ?? 0;
          const isLoud = cell.urgent && count > 0;
          return (
            <Link
              key={cell.status}
              href={`/orders?status=${cell.status}`}
              className={cn(
                "flex min-h-[104px] flex-col justify-between gap-2 rounded-card border p-4",
                "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                isLoud
                  ? "border-warn/30 bg-warn-soft hover:bg-warn-soft"
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
                  {cell.label}
                </span>
                <StatusChip status={cell.status} />
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
                {cell.caption}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Not a fifth cell: nothing on it needs doing, so giving it the same
          weight as "Not answered" would make the loudest thing on the board a
          number nobody acts on. */}
      <p className="text-[13px] text-ink-3">
        {isLoaded
          ? `${formatCount(outForDelivery)} more already out for delivery or waiting for pickup.`
          : "Counting live tickets…"}
      </p>
    </div>
  );
}
