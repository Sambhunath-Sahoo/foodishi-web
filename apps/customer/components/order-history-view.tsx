"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardFooter,
  EmptyState,
  PageTitle,
  Pagination,
  SegmentedControl,
  StatusChip,
  SEVERITY_TEXT,
  Thumb,
  buttonVariants,
  cn,
} from "@repo/ui";
import { LoadingCards, QueryError } from "./data-states";
import { ReorderButton } from "./reorder-button";
import {
  toRestaurantNameMap,
  useRestaurantIndex,
} from "../lib/queries/catalog";
import { HISTORY_PAGE_SIZE, useOrderHistory } from "../lib/queries/orders";
import { useAccount } from "../lib/use-account";
import { useNow } from "../lib/use-now";
import { isSettled } from "../lib/lifecycle";
import { describePromise } from "../lib/promise-time";
import { formatDateTime, formatMoney } from "../lib/format";
import type { OrderRead, RestaurantSummary } from "../lib/types";

type Scope = "all" | "live";

/**
 * The countdown on a live row is written in whole minutes, so a slower tick
 * than the tracking screen's second-by-second clock says the same thing for a
 * thirtieth of the re-renders.
 */
const LIVE_TICK_MS = 30_000;

const SCOPES: readonly { readonly value: Scope; readonly label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "live", label: "In progress" },
];

/**
 * Order history, newest first, from the caller-scoped GET /me/orders — the
 * bearer token decides whose list it is, so nothing is passed to the API.
 *
 * Rendered behind <RequireAccount>, so there is always a signed-in, linked
 * customer by the time this mounts.
 */
export function OrderHistoryView(): React.JSX.Element {
  const { userId, isReady } = useAccount();
  const [scope, setScope] = React.useState<Scope>("all");
  const [offset, setOffset] = React.useState(0);

  React.useEffect(() => {
    setOffset(0);
  }, [scope, userId]);

  const orders = useOrderHistory(userId, offset, scope === "live");
  const index = useRestaurantIndex();
  const kitchens = React.useMemo(
    () => toRestaurantNameMap(index.data),
    [index.data],
  );

  /**
   * The countdown the "In progress" empty state promises. It ticks only while
   * something on the page is actually live, so a screen of delivered orders
   * re-renders once and then stops — the same rule as the tracking screen.
   */
  const rows = orders.data?.items ?? [];
  const hasLiveRow = rows.some((order) => !isSettled(order.status));
  const now = useNow(hasLiveRow, LIVE_TICK_MS);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle subtitle="Newest first">Your orders</PageTitle>

      <SegmentedControl
        ariaLabel="Which orders"
        options={SCOPES}
        value={scope}
        onValueChange={setScope}
        className="w-full"
      />

      {!isReady || orders.isPending ? <LoadingCards count={3} /> : null}

      {orders.isError ? (
        <QueryError
          title="Could not load your orders"
          error={orders.error}
          onRetry={() => void orders.refetch()}
        />
      ) : null}

      {orders.isSuccess && orders.data.items.length === 0 ? (
        <EmptyState
          title={
            scope === "live"
              ? "Nothing cooking right now"
              : "You have not ordered yet"
          }
          detail={
            scope === "live"
              ? "Orders still being cooked or on their way would sit here, with a live countdown on each one."
              : "Every order you place lands here — the kitchen, what it cost and where it got to."
          }
          action={
            <Link
              href="/"
              className={cn(buttonVariants({ size: "md" }), "no-underline")}
            >
              Find a kitchen
            </Link>
          }
        />
      ) : null}

      <ul className="flex flex-col gap-3">
        {rows.map((order) => (
          <li key={order.id}>
            <OrderHistoryRow
              order={order}
              kitchen={kitchens.get(order.restaurant_id)}
              now={now}
            />
          </li>
        ))}
      </ul>

      {orders.isSuccess && orders.data.total > HISTORY_PAGE_SIZE ? (
        <Pagination
          total={orders.data.total}
          limit={orders.data.limit}
          offset={orders.data.offset}
          onOffsetChange={setOffset}
          noun="orders"
          className="rounded-card border border-line bg-surface"
        />
      ) : null}
    </div>
  );
}

function OrderHistoryRow({
  order,
  kitchen,
  now,
}: {
  readonly order: OrderRead;
  readonly kitchen: RestaurantSummary | undefined;
  readonly now: Date;
}): React.JSX.Element {
  const live = !isSettled(order.status);
  /* The order row carries only an id; the name and the cover both come from
     the cached kitchen index rather than showing "#21" and a grey box. */
  const kitchenName = kitchen?.name ?? `Kitchen #${order.restaurant_id}`;
  const promise = describePromise({
    placedAt: order.placed_at,
    promisedAt: order.promised_at,
    now,
    deliveredAt: order.delivered_at,
    isSettled: !live,
  });

  return (
    <Card stripe={order.status === "cancelled" ? "crit" : undefined}>
      <Link
        href={`/orders/${order.id}`}
        className="flex gap-3 px-4 py-3.5 no-underline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
      >
        <Thumb src={kitchen?.image_url} name={kitchenName} size={48} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-ink">
                {kitchenName}
              </h2>
              <p className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-3">
                #{order.id} · {formatDateTime(order.placed_at)}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
              {formatMoney(order.total_amount)}
            </span>
          </div>

          {/* The countdown this list's own empty state promises. Graded like
              the tracking meter, and the words carry the grade on their own —
              "18m late" reads late without any colour (DESIGN.md #3). */}
          {live ? (
            <p className="mt-2 text-[13px] leading-snug">
              <span className="text-ink-3">{promise.label} </span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  promise.tier > 0 ? SEVERITY_TEXT[promise.tier] : "text-ink",
                )}
              >
                {promise.value}
              </span>
            </p>
          ) : null}

          <div className="mt-2 flex items-center justify-between gap-3">
            <StatusChip status={order.status} />
            <span className="text-[12px] font-medium text-accent">
              {live ? "Track it" : "View"}
            </span>
          </div>
        </div>
      </Link>

      {/* Outside the link: a card-wide <a> cannot hold buttons, and Reorder
          must never be a mis-tap on the way to the order. */}
      <CardFooter className="justify-start gap-2">
        <ReorderButton orderId={order.id} restaurantId={order.restaurant_id} />
        <Link
          href={`/orders/${order.id}/receipt`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "no-underline",
          )}
        >
          Receipt
        </Link>
      </CardFooter>
    </Card>
  );
}
