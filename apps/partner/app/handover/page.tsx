"use client";

import * as React from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Freshness,
  PageTitle,
  StatusChip,
  cn,
} from "@repo/ui";
import { KitchenGate } from "../_components/kitchen-gate";
import { LatenessChip } from "../_components/lateness-chip";
import { LinkButton } from "../_components/link-button";
import { NextAction } from "../_components/next-action";
import { CardSkeletons, EmptyCard, LoadError } from "../_components/states";
import { StuckDisclosure } from "../_components/stuck-disclosure";
import {
  formatClock,
  formatCount,
  formatDuration,
  formatMoney,
  minutesSince,
  pluralise,
} from "../_lib/format";
import { isStale, readLateness } from "../_lib/lateness";
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
        "flex flex-col gap-2 px-4 py-3",
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
        <LatenessChip late={late} />
        <span className="font-mono text-[13px] tabular-nums text-ink-3">
          {formatMoney(order.total_amount)}
        </span>
        <LinkButton href={`/orders/${order.id}`} variant="ghost" size="sm" className="-my-2 ml-auto">
          Details
        </LinkButton>
      </div>

      {/* "In the building" only while it is: an order already handed over has
          left, and saying it was still here 44 days on read as a lost bag.
          The API has no handed-over timestamp, so an order on its way gets no
          third fact at all — its chip already says it left, and a bare "left
          the kitchen" with no time after it read as a line cut short. */}
      <p className="font-mono text-[13px] tabular-nums text-ink-3">
        Promised {formatClock(order.promised_at, now)} · placed{" "}
        {formatClock(order.placed_at, now)}
        {order.status === "out_for_delivery" ? null : ` · in the building ${sittingFor}`}
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

const COURIER_NOTICE_KEY_PREFIX = "foodishi.partner.courier-notice-seen.";

/**
 * Remembered per kitchen, in try/catch: a private window or a full disk throws
 * on localStorage, and a notice that cannot be dismissed for good is still
 * better than a screen that will not render.
 */
function readNoticeSeen(restaurantId: string): boolean {
  try {
    return window.localStorage.getItem(`${COURIER_NOTICE_KEY_PREFIX}${restaurantId}`) === "1";
  } catch {
    return false;
  }
}

function writeNoticeSeen(restaurantId: string): void {
  try {
    window.localStorage.setItem(`${COURIER_NOTICE_KEY_PREFIX}${restaurantId}`, "1");
  } catch {
    // Not remembered; it simply comes back on the next visit.
  }
}

/**
 * Why this screen has a courier's two buttons on it, said once and quietly.
 *
 * It was a three-line warn banner on screen permanently. Warn means time
 * pressure in this console, and "no rider is assigned" is a standing fact, not
 * a deadline — so it is one muted line, and once somebody has read it they can
 * put it away for this kitchen.
 */
function CourierNotice({ restaurantId }: { readonly restaurantId: string }): React.JSX.Element | null {
  // Unknown until mounted: the server cannot read this tablet's storage, and
  // guessing either way would be a hydration mismatch or a flash.
  const [isSeen, setIsSeen] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    setIsSeen(readNoticeSeen(restaurantId));
  }, [restaurantId]);

  if (isSeen !== false) return null;

  return (
    <p
      role="note"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card border border-line bg-surface-2 py-0.5 pr-1 pl-3 text-[14px] text-ink-2"
    >
      <span className="min-w-0 flex-1">
        No rider is assigned — you hand over and mark delivered.
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="min-h-11"
        onClick={() => {
          writeNoticeSeen(restaurantId);
          setIsSeen(true);
        }}
      >
        Got it
      </Button>
    </p>
  );
}

function Handover({ kitchen }: { readonly kitchen: ReadyKitchen }): React.JSX.Element {
  const now = useNow(TICK_QUEUE_MS);
  const queue = useLiveOrders(kitchen);

  // Only the pass: what the kitchen has finished with. Split like the list,
  // so a bag six hours past its promise does not sit at the top of "Waiting to
  // go out" as if somebody were still coming for it.
  const onPass = (queue.data === undefined ? [] : queue.data.items).filter((order) =>
    HANDOVER_STATUSES.has(order.status),
  );
  const all = onPass.filter((order) => !isStale(order, now));
  const stuck = onPass.filter((order) => isStale(order, now));
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
      <CourierNotice restaurantId={kitchen.restaurantId} />

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

          {stuck.length > 0 ? (
            <StuckDisclosure
              count={stuck.length}
              hint="Nobody is coming for these any more. Close them out here, or ask Foodishi to close them."
            >
              <div className="flex flex-col gap-3">
                {byWaiting(stuck).map((order) => (
                  <HandoverRow key={order.id} order={order} kitchen={kitchen} now={now} />
                ))}
              </div>
            </StuckDisclosure>
          ) : null}

          {waiting.length === 0 && gone.length === 0 && stuck.length === 0 ? (
            <EmptyCard
              title="Nothing has left the kitchen yet"
              detail="This screen holds orders between the kitchen and the customer. Accept and cook a ticket on the Orders board and it will arrive here."
            />
          ) : null}

          <p className="text-[13px] text-ink-3">
            <Freshness at={queue.dataUpdatedAt > 0 ? queue.dataUpdatedAt : null} /> ·{" "}
            {pluralise(all.length, "order past the kitchen", "orders past the kitchen")}
            {stuck.length > 0 ? ` · ${formatCount(stuck.length)} stuck` : null}
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
