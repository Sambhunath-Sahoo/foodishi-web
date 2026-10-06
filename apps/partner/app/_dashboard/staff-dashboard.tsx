"use client";

import * as React from "react";
import { Freshness, LiveDot, Toolbar } from "@repo/ui";
import { ServiceBoard } from "./service-board";
import { LinkButton } from "../_components/link-button";
import { MasonryGrid } from "../_components/masonry-grid";
import { OrderCard } from "../_components/order-card";
import { RefusalScopeNote } from "../_components/cancel-order-control";
import { CardSkeletons, EmptyCard, LoadError } from "../_components/states";
import { formatCount, pluralise } from "../_lib/format";
import { byUrgency, excludeStale, isPastPromised } from "../_lib/lateness";
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

  // The tiles, the waiting list, the late count and "See all N" all leave out
  // the stuck ones (over 6h past promise): they need closing, not cooking, and
  // /orders keeps them in their own collapsed section — its "All" counts them
  // out too, so every number here matches the page it links to.
  const allLive = queue.data === undefined ? [] : queue.data.items;
  const orders = byUrgency(excludeStale(allLive, now), now);
  const isLoaded = queue.data !== undefined;

  const needsDecision = orders.filter((order) => isKitchenWork(order.status));
  const late = orders.filter((order) => isPastPromised(order, now)).length;
  const shown = needsDecision.slice(0, CARDS_SHOWN);
  // Measured against the whole live queue, so stuck tickets left off this
  // list still leave a way to /orders where they are.
  const hidden = allLive.length - shown.length;
  const stuck = allLive.length - orders.length;

  return (
    <div className="flex flex-col gap-5">
      <ServiceBoard
        orders={orders}
        isLoaded={isLoaded}
        canSeePickups={kitchen.can("handover.view")}
      />

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
                className="text-[13px]"
                interval={QUEUE_REFRESH_MS / MS_PER_SECOND}
                at={queue.dataUpdatedAt > 0 ? queue.dataUpdatedAt : null}
              />
            }
          >
            <h2 className="font-title text-[19px] text-ink">Waiting on you</h2>
            {late > 0 ? (
              <span className="rounded-chip border border-crit/25 bg-crit-soft px-2 py-0.5 text-[13px] text-crit">
                {formatCount(late)} past promised
              </span>
            ) : null}
          </Toolbar>

          {needsDecision.length === 0 ? (
            <EmptyCard
              title="Nothing needs a decision right now"
              detail="Tickets appear here the moment a customer checks out, and stay until they have been accepted, cooked and handed over. The four numbers above are every ticket in front of the kitchen."
            />
          ) : (
            // The same grid as the live queue: two columns on a landscape
            // tablet (~1180px, exactly the device this screen is for), each
            // card at its own height.
            <>
              <RefusalScopeNote orders={shown} kitchen={kitchen} />
              <MasonryGrid>
                {shown.map((order) => (
                  <OrderCard key={order.id} order={order} kitchen={kitchen} now={now} />
                ))}
              </MasonryGrid>
            </>
          )}

          {hidden > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              {/* The live queue as /orders counts it under "All": every ticket
                  in front of the kitchen, stuck ones named in the line beside.
                  With only stuck ones left, "See all 0 tickets" would be a
                  button promising nothing, so it goes to where they are. */}
              {orders.length > 0 ? (
                <LinkButton href="/orders">
                  See all {pluralise(orders.length, "ticket", "tickets")}
                </LinkButton>
              ) : (
                <LinkButton href="/orders?view=list#stuck">See the stuck tickets</LinkButton>
              )}
              <p className="text-[13px] text-ink-3">
                {stuck > 0
                  ? `${pluralise(stuck, "ticket is", "tickets are")} stuck over 6 h past promise — they need closing, not cooking.`
                  : `${pluralise(hidden, "more ticket", "more tickets")} not shown here.`}
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
