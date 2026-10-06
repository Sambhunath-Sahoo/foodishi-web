"use client";

import * as React from "react";
import Link from "next/link";
import { Skeleton, StatusChip } from "@repo/ui";
import { CancelOrderControl } from "./cancel-order-control";
import { LatenessChip } from "./lateness-chip";
import { NextAction } from "./next-action";
import { OrderClock, settledAtOf } from "./order-clock";
import { OrderItems } from "./order-items";
import { LoadError } from "./states";
import { TicketCard } from "./ticket-card";
import { formatMoney } from "../_lib/format";
import { readLateness } from "../_lib/lateness";
import { canRestaurantCancel } from "../../lib/order-flow";
import { useDishFaces } from "../../lib/queries/menu";
import { useOrder } from "../../lib/queries/orders";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { Order } from "../../lib/types";

export interface OrderCardProps {
  readonly order: Order;
  readonly kitchen: ReadyKitchen;
  readonly now: number;
}

/**
 * One ticket, one decision.
 *
 * Cards survive on this screen because that is literally true — everything else
 * in the console is a board. They still inherit the density rules that carry
 * meaning: a graded 3px rule, formatted lateness, a mono id and tabular money.
 *
 * The list read does not carry line items, so each card reads its own order —
 * cached forever, because a placed order's lines are frozen.
 */
export function OrderCard({ order, kitchen, now }: OrderCardProps): React.JSX.Element {
  const orderId = String(order.id);
  const late = readLateness(order.status, order.promised_at, now);
  const detail = useOrder(kitchen, orderId, { frozen: true });
  const faces = useDishFaces(kitchen);

  return (
    // One padded column rather than header / body / footer bands: the two
    // borders and four padding strips between them were a fifth of the card's
    // height and carried nothing a cook reads.
    <TicketCard
      tier={late.tier}
      data-order-card={order.id}
      className="@container flex flex-col gap-1.5 py-2 pr-3 pl-4"
    >
      {/* The ticket's head: who it is, where it stands, how late. Details is
          quiet, but still a 44px target — the negative margin lets the hit
          area overhang the row instead of setting its height. */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span className="mr-0.5 font-mono text-[18px] leading-none font-semibold tabular-nums text-ink">
          #{order.id}
        </span>
        <StatusChip status={order.status} />
        <LatenessChip late={late} />
        <Link
          href={`/orders/${order.id}`}
          className="-my-2.5 -mr-2 ml-auto inline-flex min-h-11 shrink-0 items-center rounded-card px-2 font-sans text-[14px] font-medium text-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Details
        </Link>
      </div>

      {/* The clock and the money share one line. The total used to have a
          row of its own under the dishes; on a three-dish ticket that row was
          a tenth of the card, and the lines are counted by looking at them. */}
      <div className="flex items-baseline gap-3">
        <OrderClock
          status={order.status}
          placedAt={order.placed_at}
          promisedAt={order.promised_at}
          settledAt={settledAtOf(order)}
          now={now}
          className="min-w-0 flex-1"
        />
        <span className="flex shrink-0 items-baseline gap-1.5">
          {/* Labelled wherever the card is wide enough; in a three-column
              grid the word would push the clock line into truncating
              "waiting", so it is left to screen readers there. */}
          <span aria-hidden="true" className="hidden text-[13px] leading-4 text-ink-3 @md:inline">
            Total
          </span>
          <span className="font-mono text-[16px] leading-4 font-semibold tabular-nums text-ink">
            <span className="sr-only">Order total </span>
            {formatMoney(order.total_amount)}
          </span>
        </span>
      </div>

      {detail.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-2/3" label="Loading order lines" />
          <Skeleton className="h-5 w-1/2" label="Loading order lines" />
        </div>
      ) : null}

      {detail.error !== null ? (
        <LoadError
          error={detail.error}
          title="Could not load the lines for this order"
          onRetry={() => {
            void detail.refetch();
          }}
        />
      ) : null}

      {detail.data !== undefined ? <OrderItems items={detail.data.items} faces={faces} /> : null}

      {/* 12px between the two, not 8: the refusal sits under the button tapped
          forty times an hour, and the extra gap is what keeps a hurried thumb
          on the right one. No refusal note here when it is not the reader's to
          make — the list says that once, above every card. */}
      <div className="flex flex-col items-stretch gap-3 border-t border-line pt-2">
        <NextAction order={order} kitchen={kitchen} now={now} />
        {canRestaurantCancel(order.status) ? (
          <CancelOrderControl
            order={order}
            kitchen={kitchen}
            now={now}
            explainsRefusal={false}
          />
        ) : null}
      </div>
    </TicketCard>
  );
}
