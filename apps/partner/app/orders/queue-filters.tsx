"use client";

import * as React from "react";
import { cn } from "@repo/ui";
import { formatCount } from "../_lib/format";
import { isPastPromised } from "../_lib/lateness";
import { HANDOVER_STATUSES, isKitchenWork } from "../../lib/order-flow";
import type { Order } from "../../lib/types";

export type QueueFilter = "all" | "new" | "cook" | "courier" | "late";

interface FilterDefinition {
  readonly value: QueueFilter;
  readonly label: string;
  /** Hover text: what a ticket has to be to count here. */
  readonly title: string;
  readonly matches: (order: Order, now: number) => boolean;
}

/**
 * The live queue's filters, in the order a cook reads them.
 *
 * "To cook" and "With courier" partition the queue: every live ticket is
 * either still the kitchen's own work (accept, cook, mark ready) or past the
 * pass (hand over, mark delivered). So the two always add up to All, which is
 * what made the old "Waiting on you 7 of 7" a broken number — it counted the
 * courier moves the kitchen only stands in for as kitchen work.
 */
const FILTERS: readonly FilterDefinition[] = [
  {
    value: "all",
    label: "All",
    title: "Every live ticket in front of the kitchen. Stuck ones are counted in their own section below.",
    matches: () => true,
  },
  {
    value: "new",
    label: "Not answered",
    title: "Incoming tickets nobody has accepted or rejected yet.",
    matches: (order) => order.status === "pending",
  },
  {
    value: "cook",
    label: "To cook",
    title: "Accept, cook or mark ready: the kitchen's own moves.",
    matches: (order) => isKitchenWork(order.status),
  },
  {
    value: "courier",
    label: "With courier",
    title: "Ready to go out, or on the way. The kitchen only stands in for the courier here.",
    matches: (order) => HANDOVER_STATUSES.has(order.status),
  },
  {
    value: "late",
    label: "Past promised",
    title: "Past the promised time but under six hours late. Stuck tickets are counted separately.",
    matches: (order, now) => isPastPromised(order, now),
  },
];

const BY_VALUE: ReadonlyMap<string, FilterDefinition> = new Map(
  FILTERS.map((filter) => [filter.value, filter]),
);

/** `?filter=` arrives from the URL, so it is checked against the real list. */
export function readQueueFilter(raw: string | null): QueueFilter {
  return raw !== null && BY_VALUE.has(raw) ? (raw as QueueFilter) : "all";
}

export function applyQueueFilter(
  orders: readonly Order[],
  filter: QueueFilter,
  now: number,
): readonly Order[] {
  const definition = BY_VALUE.get(filter);
  if (definition === undefined || filter === "all") return orders;
  return orders.filter((order) => definition.matches(order, now));
}

export interface QueueFiltersProps {
  /**
   * The live queue without its stuck tickets; undefined while it loads.
   *
   * Without them, because every count here is a promise about the cards under
   * it. "All 10" over eight cards and a closed Stuck (2) read as two missing
   * tickets; now All is the cards shown, To cook and With courier still add up
   * to it, and Stuck carries its own count where the stuck tickets are.
   */
  readonly orders: readonly Order[] | undefined;
  readonly now: number;
  readonly value: QueueFilter;
  readonly onValueChange: (next: QueueFilter) => void;
}

/**
 * Toggle buttons, exactly one pressed. They used to be chips that looked like
 * filters and did nothing when tapped.
 */
export function QueueFilters({
  orders,
  now,
  value,
  onValueChange,
}: QueueFiltersProps): React.JSX.Element {
  return (
    <div role="group" aria-label="Filter the live queue" className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => {
        const count = orders === undefined ? null : orders.filter((order) => filter.matches(order, now)).length;
        const isPressed = filter.value === value;
        const isUrgent = filter.value === "late" && count !== null && count > 0;
        return (
          <button
            key={filter.value}
            type="button"
            aria-pressed={isPressed}
            title={filter.title}
            onClick={() => onValueChange(filter.value)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-card border px-3.5 text-[15px] font-medium transition-colors",
              isPressed
                ? "border-accent bg-accent text-on-accent"
                : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2",
            )}
          >
            {isUrgent && !isPressed ? (
              <span aria-hidden="true" className="size-1.5 rounded-chip bg-crit" />
            ) : null}
            {filter.label}
            <span
              className={cn(
                "font-mono tabular-nums",
                isPressed ? "text-on-accent" : isUrgent ? "font-semibold text-crit" : "text-ink-3",
              )}
            >
              {count === null ? "…" : formatCount(count)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
