"use client";

import * as React from "react";
import { FilterChip, LiveDot, Toolbar } from "@repo/ui";
import { RefusalScopeNote } from "../_components/cancel-order-control";
import { MasonryGrid } from "../_components/masonry-grid";
import { OrderCard } from "../_components/order-card";
import { CardSkeletons, EmptyCard, LoadError } from "../_components/states";
import { StuckDisclosure } from "../_components/stuck-disclosure";
import { pluralise } from "../_lib/format";
import { byUrgency, isStale } from "../_lib/lateness";
import { TICK_QUEUE_MS, useNow } from "../_lib/use-now";
import { applyQueueFilter, type QueueFilter } from "./queue-filters";
import { QUEUE_REFRESH_MS } from "../../lib/query-keys";
import { useLiveOrders } from "../../lib/queries/orders";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { OrderStatus } from "../../lib/types";

const MS_PER_SECOND = 1_000;

const FILTER_NAMES: Record<QueueFilter, string> = {
  all: "the live queue",
  new: "Not answered",
  cook: "To cook",
  courier: "With courier",
  late: "Past promised",
};

export interface LiveBoardProps {
  readonly kitchen: ReadyKitchen;
  /** Narrowed by a dashboard link, and clearable from the chip it draws. */
  readonly status: OrderStatus | null;
  readonly onStatusChange: (status: OrderStatus | null) => void;
  /** The pressed queue filter, from `?filter=`. */
  readonly filter: QueueFilter;
}

/**
 * Everything not yet delivered or cancelled, most urgent first.
 *
 * One ticket, one card, one decision. Sorted by whose move it is and then by
 * minutes past promised, so the top of this list is always the next thing to
 * do — a ticket already with a courier can be an hour overdue and still not be
 * the most urgent thing in the room, because the cook has nothing to do on it.
 *
 * Tickets more than six hours past their promise are not in the queue at all.
 * Nobody is waiting on that food any more; leaving them at the top, as red as
 * a ticket three minutes late, buried every order that could still be saved.
 * They sit in a closed "Stuck" section underneath instead.
 */
export function LiveBoard({
  kitchen,
  status,
  onStatusChange,
  filter,
}: LiveBoardProps): React.JSX.Element {
  const now = useNow(TICK_QUEUE_MS);
  const queue = useLiveOrders(kitchen);

  const all = queue.data === undefined ? [] : byUrgency(queue.data.items, now);
  const byStatus = status === null ? all : all.filter((order) => order.status === status);
  const shown = applyQueueFilter(byStatus, filter, now);
  const live = shown.filter((order) => !isStale(order, now));
  const stuck = shown.filter((order) => isStale(order, now));
  const isLoaded = queue.data !== undefined;

  return (
    <div className="flex flex-col gap-4">
      {status !== null || isLoaded ? (
        <Toolbar
          ariaLabel="Live queue status"
          right={
            <LiveDot
              interval={QUEUE_REFRESH_MS / MS_PER_SECOND}
              at={queue.dataUpdatedAt > 0 ? queue.dataUpdatedAt : null}
            />
          }
        >
          {status !== null ? (
            <FilterChip
              label="Status"
              value={status.replace(/_/g, " ")}
              tone="accent"
              onDismiss={() => onStatusChange(null)}
              title="Narrowed from the dashboard. Dismiss to see the whole live queue."
            />
          ) : (
            <span className="text-[13px] text-ink-3">
              Sorted by whose move it is, then by minutes past promised
            </span>
          )}
        </Toolbar>
      ) : null}

      {queue.isPending ? <CardSkeletons count={3} /> : null}

      {queue.error !== null ? (
        <LoadError
          error={queue.error}
          title="Could not load the queue"
          onRetry={() => {
            void queue.refetch();
          }}
        />
      ) : null}

      {isLoaded && live.length === 0 ? (
        <EmptyCard
          title={describeEmptyTitle(filter, status, stuck.length)}
          detail={describeEmptyDetail(stuck.length, filter, status)}
        />
      ) : null}

      {live.length > 0 ? <RefusalScopeNote orders={live} kitchen={kitchen} /> : null}

      {live.length > 0 ? (
        <MasonryGrid>
          {live.map((order) => (
            <OrderCard key={order.id} order={order} kitchen={kitchen} now={now} />
          ))}
        </MasonryGrid>
      ) : null}

      {live.length > 0 ? (
        <p className="text-[13px] text-ink-3">
          {pluralise(live.length, "ticket", "tickets")} in front of the kitchen ·{" "}
          {pluralise(all.length, "live ticket", "live tickets")} in all
        </p>
      ) : null}

      {stuck.length > 0 ? (
        // The anchor the board's "See list" lands on.
        <div id="stuck" className="scroll-mt-4">
          <StuckDisclosure
            count={stuck.length}
            hint={
              kitchen.can("orders.cancel")
                ? "These need closing, not cooking. Cancel them, or ask Foodishi to close them."
                : "These need closing, not cooking. A manager can cancel them, or ask Foodishi to close them."
            }
          >
            {/* Its own copy of the note: opened with the queue above empty, the
                stuck cards would otherwise lose their refusal without a word. */}
            <RefusalScopeNote orders={stuck} kitchen={kitchen} />
            <MasonryGrid>
              {stuck.map((order) => (
                <OrderCard key={order.id} order={order} kitchen={kitchen} now={now} />
              ))}
            </MasonryGrid>
          </StuckDisclosure>
        </div>
      ) : null}
    </div>
  );
}

function describeEmptyTitle(
  filter: QueueFilter,
  status: OrderStatus | null,
  stuckCount: number,
): string {
  if (status !== null) return `Nothing is ${status.replace(/_/g, " ")} right now`;
  if (filter !== "all") return `Nothing in ${FILTER_NAMES[filter]} right now`;
  return stuckCount > 0 ? "Nothing in front of the kitchen right now" : "No live orders right now";
}

function describeEmptyDetail(
  stuckCount: number,
  filter: QueueFilter,
  status: OrderStatus | null,
): string {
  if (stuckCount > 0) {
    return `${pluralise(stuckCount, "ticket is", "tickets are")} over six hours past the promise, so ${stuckCount === 1 ? "it sits" : "they sit"} in Stuck below instead of in the queue. New tickets land here the moment a customer checks out.`;
  }
  if (status !== null) return "Dismiss the status chip above to see the whole live queue.";
  if (filter !== "all") return "Press All above to see every live ticket.";
  return "New tickets land here the moment a customer checks out, and stay until they are delivered or cancelled.";
}
