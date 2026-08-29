"use client";

import * as React from "react";
import Link from "next/link";
import {
  CardBody,
  CardFooter,
  CardHeader,
  SEVERITY_TEXT,
  Skeleton,
  StatusChip,
  cn,
} from "@repo/ui";
import { CancelOrderControl } from "./cancel-order-control";
import { NextAction } from "./next-action";
import { OrderClock } from "./order-clock";
import { OrderItems } from "./order-items";
import { LoadError } from "./states";
import { TicketCard } from "./ticket-card";
import { formatMoney, pluralise } from "../_lib/format";
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

  const itemCount = detail.data?.items.length ?? 0;

  return (
    <TicketCard tier={late.tier}>
      <CardHeader className="flex-wrap items-center gap-x-3 gap-y-2 py-2.5 pl-5">
        <span className="font-mono text-[19px] leading-none font-semibold tabular-nums text-ink">
          #{order.id}
        </span>
        <StatusChip status={order.status} />
        <span
          className={cn("font-mono text-[15px] tabular-nums", SEVERITY_TEXT[late.tier])}
        >
          {late.headline}
        </span>

        <Link
          href={`/orders/${order.id}`}
          className="ml-auto inline-flex min-h-11 items-center rounded-card px-3 font-sans text-[15px] font-medium text-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Details
        </Link>
      </CardHeader>

      <CardBody className="flex flex-col gap-2 py-2.5 pl-5">
        <OrderClock
          status={order.status}
          placedAt={order.placed_at}
          promisedAt={order.promised_at}
          now={now}
        />

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

        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2">
          <span className="text-[13px] text-ink-3">
            {itemCount === 0
              ? "Order total"
              : `${pluralise(itemCount, "line", "lines")} · order total`}
          </span>
          <span className="font-mono text-[18px] font-semibold tabular-nums text-ink">
            {formatMoney(order.total_amount)}
          </span>
        </div>
      </CardBody>

      <CardFooter className="flex-col items-stretch gap-2 py-2.5 pl-5">
        <NextAction order={order} kitchen={kitchen} now={now} />
        {canRestaurantCancel(order.status) ? (
          <CancelOrderControl order={order} kitchen={kitchen} now={now} />
        ) : null}
      </CardFooter>
    </TicketCard>
  );
}
