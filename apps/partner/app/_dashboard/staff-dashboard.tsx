"use client";

import * as React from "react";
import { Freshness, LiveDot, Toolbar } from "@repo/ui";
import { ServiceBoard } from "./service-board";
import { LinkButton } from "../_components/link-button";
import { OrderCard } from "../_components/order-card";
import { CardSkeletons, EmptyCard, LoadError } from "../_components/states";
import { formatCount, pluralise } from "../_lib/format";
import { byUrgency, readLateness } from "../_lib/lateness";
import { TICK_QUEUE_MS, useNow } from "../_lib/use-now";
import { QUEUE_REFRESH_MS } from "../../lib/query-keys";
import { isKitchenWork } from "../../lib/order-flow";
import { useLiveOrders } from "../../lib/queries/orders";
import type { ReadyKitchen } from "../../lib/kitchen";

const MS_PER_SECOND = 1_000;
/** Enough of the queue to work from without scrolling past the point. */
const CARDS_SHOWN = 6;

/**
 * The shift worker's dashboard: what is happening right now, and the tickets
 * that need a decision.
 *
 * No money on this screen at all. Not because a cook cannot be trusted with a
 * number, but because none of it changes what they do next — and every figure
 * that does not change a decision is competing with the four that do. The
 * revenue, the commission and the settlements live behind `payments.view`,
 * which a shift worker does not hold.
 */
export function StaffDashboard({
  kitchen,
}: {
  readonly kitchen: ReadyKitchen;
}): React.JSX.Element {
  const now = useNow(TICK_QUEUE_MS);
  const queue = useLiveOrders(kitchen);

  const orders = queue.data === undefined ? [] : byUrgency(queue.data.items, now);
  const isLoaded = queue.data !== undefined;

  const needsDecision = orders.filter((order) => isKitchenWork(order.status));
  const late = orders.filter(
    (order) => readLateness(order.status, order.promised_at, now).isLate,
  ).length;
  const shown = needsDecision.slice(0, CARDS_SHOWN);
  const hidden = needsDecision.length - shown.length;

  return (
    <div className="flex flex-col gap-5">
      <ServiceBoard orders={orders} isLoaded={isLoaded} />

      {queue.isPending ? <CardSkeletons count={2} label="Loading the queue" /> : null}

      {queue.error !== null ? (
        <LoadError
          error={queue.error}
          title="Could not load the queue"
          onRetry={() => {
            void queue.refetch();
          }}
        />
      ) : null}

      {isLoaded ? (
        <div className="flex flex-col gap-3">
          <Toolbar
            ariaLabel="Queue status"
            right={
              <LiveDot
                interval={QUEUE_REFRESH_MS / MS_PER_SECOND}
                at={queue.dataUpdatedAt > 0 ? queue.dataUpdatedAt : null}
              />
            }
          >
            <h2 className="font-title text-[19px] text-ink">Waiting on you</h2>
            {late > 0 ? (
              <span className="rounded-chip border border-crit/25 bg-crit-soft px-2 py-0.5 text-[12px] text-crit">
                {formatCount(late)} past promised
              </span>
            ) : null}
          </Toolbar>

          {needsDecision.length === 0 ? (
            <EmptyCard
              title="Nothing needs a decision right now"
              detail="Tickets appear here the moment a customer checks out, and stay until they have been accepted, cooked and handed over. The four numbers above are the whole live queue."
            />
          ) : (
            // Two columns once the tablet is wide enough to hold them. A
            // landscape tablet sits around 1180px and is exactly the device
            // this screen is for, so the break is `lg` and not `xl`.
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              {shown.map((order) => (
                <OrderCard key={order.id} order={order} kitchen={kitchen} now={now} />
              ))}
            </div>
          )}

          {hidden > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <LinkButton href="/orders">
                See all {pluralise(needsDecision.length, "ticket", "tickets")}
              </LinkButton>
              <p className="text-[13px] text-ink-3">
                {pluralise(hidden, "more ticket", "more tickets")} not shown here.
              </p>
            </div>
          ) : null}

          <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-ink-3">
            <span>sorted by what needs a decision, then by minutes past promised</span>
            <span aria-hidden="true" className="text-ink-4">
              ·
            </span>
            <Freshness at={queue.dataUpdatedAt > 0 ? queue.dataUpdatedAt : null} />
          </p>
        </div>
      ) : null}
    </div>
  );
}
