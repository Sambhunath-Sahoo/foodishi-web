"use client";

import * as React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorBanner,
  Freshness,
  PageTitle,
  SEVERITY_TEXT,
  StatusChip,
  cn,
} from "@repo/ui";
import { KitchenGate } from "../_components/kitchen-gate";
import { LinkButton } from "../_components/link-button";
import { NextAction } from "../_components/next-action";
import { CardSkeletons, EmptyCard, LoadError } from "../_components/states";
import { formatClock, formatDuration, formatMoney, minutesSince, pluralise } from "../_lib/format";
import { readLateness } from "../_lib/lateness";
import { TICK_QUEUE_MS, useNow } from "../_lib/use-now";
import { HANDOVER_STATUSES } from "../../lib/order-flow";
import { useLiveOrders } from "../../lib/queries/orders";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { Order } from "../../lib/types";

/**
 * One order sitting on the pass.
 *
 * Deliberately thinner than a queue card: nothing here is a decision about what
 * to cook, so there are no lines and no total-as-a-headline. What matters is
 * which order it is, how long it has been sitting, and the one button.
 */
function HandoverRow({
  order,
  kitchen,
  now,
}: {
  readonly order: Order;
  readonly kitchen: ReadyKitchen;
  readonly now: number;
}): React.JSX.Element {
  const late = readLateness(order.status, order.promised_at, now);
  const sittingFor = formatDuration(minutesSince(order.placed_at, now));

  return (
    <Card
      className={cn(
        "flex flex-col gap-3 p-4",
        // The rule is graded by lateness, like every ticket in this console. A
        // ready order going cold on the pass is the one thing this screen is
        // for, so it is allowed to be the loudest row on it.
        late.tier !== 0 && "border-l-[3px] border-l-crit",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[19px] leading-none font-semibold tabular-nums text-ink">
          #{order.id}
        </span>
        <StatusChip status={order.status} />
        <span
          className={cn("font-mono text-[14px] tabular-nums", SEVERITY_TEXT[late.tier])}
        >
          {late.headline}
        </span>
        <span className="font-mono text-[13px] tabular-nums text-ink-3">
          {formatMoney(order.total_amount)}
        </span>
        <LinkButton href={`/orders/${order.id}`} variant="ghost" size="sm" className="ml-auto">
          Details
        </LinkButton>
      </div>

      <p className="font-mono text-[13px] tabular-nums text-ink-3">
        promised {formatClock(order.promised_at)} · placed {formatClock(order.placed_at)} ·
        in the building {sittingFor}
      </p>

      {/*
        The one screen where a delivery note is actually actionable — somebody is
        holding the bag. Loud, because it changes what they do at the door, and
        it is the only thing on this row that is not a time or an amount.
      */}
      {order.delivery_note !== null && order.delivery_note !== "" ? (
        <p className="rounded-card border border-warn/30 bg-warn-soft px-3 py-2 text-[14px] leading-snug text-warn">
          <span className="font-semibold">At the door:</span> {order.delivery_note}
        </p>
      ) : null}

      <NextAction order={order} kitchen={kitchen} now={now} />
    </Card>
  );
}

function Handover({ kitchen }: { readonly kitchen: ReadyKitchen }): React.JSX.Element {
  const now = useNow(TICK_QUEUE_MS);
  const queue = useLiveOrders(kitchen);

  const all = queue.data === undefined ? [] : queue.data.items;
  const isLoaded = queue.data !== undefined;

  // Longest-waiting first, both lists. On a pass, the order that has been
  // sitting there is the order going cold.
  const byWaiting = (rows: readonly Order[]): readonly Order[] =>
    [...rows].sort(
      (left, right) =>
        new Date(left.promised_at).getTime() - new Date(right.promised_at).getTime(),
    );

  const waiting = byWaiting(all.filter((order) => order.status === "ready_for_pickup"));
  const gone = byWaiting(all.filter((order) => order.status === "out_for_delivery"));

  return (
    <div className="flex flex-col gap-5">
      {/*
        The whole reason this screen has two buttons on it. Stated once, at the
        top, rather than implied by a label — somebody marking an order
        delivered is recording a fact about the world, and they should know that
        nobody else is going to correct it.
      */}
      <ErrorBanner
        tone="warn"
        title="You are standing in for the courier"
        message="Handing over and marking delivered belong to a delivery partner, and the platform does have riders — but none is assigned to these orders, so this restaurant makes both moves. Only mark an order delivered once the customer actually has the food: it closes the order and counts it as revenue, and nobody downstream will correct it."
      />

      {queue.isPending ? <CardSkeletons count={2} label="Loading the pass" /> : null}

      {queue.error !== null ? (
        <LoadError
          error={queue.error}
          title="Could not load the pass"
          onRetry={() => {
            void queue.refetch();
          }}
        />
      ) : null}

      {isLoaded ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Waiting to go out</CardTitle>
              <span className="font-mono text-[13px] tabular-nums text-ink-3">
                {pluralise(waiting.length, "order", "orders")}
              </span>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              {waiting.length === 0 ? (
                <p className="text-[15px] text-ink-3">
                  Nothing is sitting on the pass. An order appears here the moment
                  the kitchen marks it ready.
                </p>
              ) : (
                waiting.map((order) => (
                  <HandoverRow key={order.id} order={order} kitchen={kitchen} now={now} />
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>On their way</CardTitle>
              <span className="font-mono text-[13px] tabular-nums text-ink-3">
                {pluralise(gone.length, "order", "orders")}
              </span>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              {gone.length === 0 ? (
                <p className="text-[15px] text-ink-3">
                  Nothing is out for delivery. Orders move here when they are handed
                  over, and leave the queue when they are marked delivered.
                </p>
              ) : (
                gone.map((order) => (
                  <HandoverRow key={order.id} order={order} kitchen={kitchen} now={now} />
                ))
              )}
            </CardBody>
          </Card>

          {waiting.length === 0 && gone.length === 0 ? (
            <EmptyCard
              title="Nothing has left the kitchen yet"
              detail="This screen holds orders between the kitchen and the customer. Accept and cook a ticket on the Orders board and it will arrive here."
            />
          ) : null}

          <p className="text-[13px] text-ink-3">
            <Freshness at={queue.dataUpdatedAt > 0 ? queue.dataUpdatedAt : null} /> ·{" "}
            {pluralise(
              all.filter((order) => HANDOVER_STATUSES.has(order.status)).length,
              "order past the kitchen",
              "orders past the kitchen",
            )}
          </p>
        </>
      ) : null}
    </div>
  );
}

/**
 * The pass: what is cooked and waiting, and what has gone out.
 *
 * Its own screen rather than a filter on the orders board because it is a
 * different job done by a different pair of hands — somebody standing at the
 * hatch, not somebody deciding what to cook. It needs `handover.view`, which
 * every shift worker holds.
 */
export default function HandoverPage(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle subtitle="Orders the kitchen has finished with, and what happens to them next.">
        Pickups
      </PageTitle>

      <KitchenGate loadingCards={2} loadingLabel="Loading the pass" requires="handover.view">
        {(kitchen) => <Handover kitchen={kitchen} />}
      </KitchenGate>
    </div>
  );
}
