"use client";

import * as React from "react";
import { FilterChip, LiveDot, Toolbar } from "@repo/ui";
import { OrderCard } from "../_components/order-card";
import { CardSkeletons, EmptyCard, LoadError } from "../_components/states";
import { formatCount, pluralise } from "../_lib/format";
import { byUrgency, readLateness } from "../_lib/lateness";
import { TICK_QUEUE_MS, useNow } from "../_lib/use-now";
import { QUEUE_REFRESH_MS } from "../../lib/query-keys";
import { hasKitchenDecision } from "../../lib/order-flow";
import { useLiveOrders } from "../../lib/queries/orders";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { OrderStatus } from "../../lib/types";

const MS_PER_SECOND = 1_000;

export interface LiveBoardProps {
  readonly kitchen: ReadyKitchen;
  /** Narrowed by a dashboard link, and clearable from the chip it draws. */
  readonly status: OrderStatus | null;
  readonly onStatusChange: (status: OrderStatus | null) => void;
}

/**
 * Everything not yet delivered or cancelled, most urgent first.
 *
 * One ticket, one card, one decision. Sorted by what needs a decision and then
 * by minutes past promised, so the top of this list is always the next thing to
 * do — a ticket already with a courier can be an hour overdue and still not be
 * the most urgent thing in the room, because there is nothing to press on it.
 */
export function LiveBoard({
  kitchen,
  status,
  onStatusChange,
}: LiveBoardProps): React.JSX.Element {
  const now = useNow(TICK_QUEUE_MS);
  const queue = useLiveOrders(kitchen);

  const all = queue.data === undefined ? [] : byUrgency(queue.data.items, now);
  const orders = status === null ? all : all.filter((order) => order.status === status);
  const isLoaded = queue.data !== undefined;

  const pastPromised = all.filter(
    (order) => readLateness(order.status, order.promised_at, now).isLate,
  ).length;
  const waitingOnYou = all.filter((order) => hasKitchenDecision(order.status)).length;
  const notAnswered = all.filter((order) => order.status === "pending").length;

  return (
    <div className="flex flex-col gap-4">
      <Toolbar
        ariaLabel="Live queue filters"
        right={
          <LiveDot
            interval={QUEUE_REFRESH_MS / MS_PER_SECOND}
            at={queue.dataUpdatedAt > 0 ? queue.dataUpdatedAt : null}
          />
        }
      >
        {isLoaded ? (
          <>
            <FilterChip
              label="Not answered"
              value={formatCount(notAnswered)}
              tone={notAnswered > 0 ? "warn" : "mute"}
              title="Incoming tickets nobody has accepted or rejected yet. Each one is a customer still waiting to hear back."
            />
            <FilterChip
              label="Waiting on you"
              value={formatCount(waitingOnYou)}
              tone={waitingOnYou > 0 ? "warn" : "mute"}
              title="Tickets with a move somebody here can still make. These sort to the top."
            />
            <FilterChip
              label="Past promised"
              value={formatCount(pastPromised)}
              tone={pastPromised > 0 ? "crit" : "mute"}
              title="Live tickets already past the time the customer was promised."
            />
            {status !== null ? (
              <FilterChip
                label="Status"
                value={status.replace(/_/g, " ")}
                tone="accent"
                onDismiss={() => onStatusChange(null)}
                title="Narrowed from the dashboard. Dismiss to see the whole live queue."
              />
            ) : null}
          </>
        ) : (
          <span className="text-[15px] text-ink-2">Counting live tickets…</span>
        )}
      </Toolbar>

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

      {isLoaded && orders.length === 0 ? (
        <EmptyCard
          title={
            status === null
              ? "No live orders right now"
              : `Nothing is ${status.replace(/_/g, " ")} right now`
          }
          detail={
            status === null
              ? "New tickets land here the moment a customer checks out, and stay until they are delivered or cancelled."
              : "Dismiss the status chip above to see the whole live queue."
          }
        />
      ) : null}

      {/* Two columns once the tablet is wide enough. One 900px column of cards
          showed a ticket and a half; two roughly double that, and one card is
          still one decision. The DOM order is still the urgency order, so a
          screen reader and a keyboard walk the same sequence. */}
      {orders.length > 0 ? (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} kitchen={kitchen} now={now} />
          ))}
        </div>
      ) : null}

      {orders.length > 0 ? (
        <p className="text-[13px] text-ink-3">
          {pluralise(orders.length, "ticket", "tickets")} of{" "}
          {pluralise(all.length, "live ticket", "live tickets")} · sorted by what
          needs a decision, then by minutes past promised
        </p>
      ) : null}
    </div>
  );
}
