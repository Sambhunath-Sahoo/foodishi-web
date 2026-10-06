"use client";

import * as React from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { services } from "../lib/services";
import {
  Badge,
  Card,
  CardBody,
  EmptyState,
  PageTitle,
  Skeleton,
  Stat,
  StatRail,
} from "@repo/ui";
import { LoadingLines, QueryError } from "./data-states";
import { formatDateTime, formatMoney } from "../lib/format";
import { useAccount } from "../lib/use-account";
import { useOrderHistory } from "../lib/queries/orders";
import {
  customerProviderLabel,
  describePayment,
  paymentMethodLabel,
  paymentStatusWord,
} from "../lib/payment";
import type { Payment } from "../lib/types";

interface OrderPayments {
  readonly orderId: number;
  /** The attempt that says where the order stands, then the rest, newest first. */
  readonly attempts: readonly Payment[];
}

function newestFirst(left: Payment, right: Payment): number {
  return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
}

/**
 * Money that moved outranks an attempt still open, which outranks a decline —
 * the same order lib/payment.ts::paymentStanding reads them in. Without it a
 * decline and the capture after it, stamped the same minute, could put
 * "Failed" at the head of an order that was paid.
 */
const STANDING_RANK: Readonly<Record<string, number>> = {
  captured: 0,
  refunded: 0,
  partially_refunded: 0,
  authorized: 1,
  pending: 1,
};
const UNRANKED = 2;

function byStanding(left: Payment, right: Payment): number {
  const rank =
    (STANDING_RANK[left.status] ?? UNRANKED) - (STANDING_RANK[right.status] ?? UNRANKED);
  return rank !== 0 ? rank : newestFirst(left, right);
}

/** "UPI" or "UPI · Razorpay" — never the sandbox's own name. */
function methodLine(payment: Payment): string {
  const provider = customerProviderLabel(payment.provider);
  const method = paymentMethodLabel(payment.method);
  return provider === null ? method : `${method} · ${provider}`;
}

/**
 * Every payment this account has made, newest first.
 *
 * There is no `/me/payments`: payments hang off an order, so this reads the
 * order page and then one payments call per order. That is a fan-out, which is
 * why it is capped to the first page of history rather than walking all of it —
 * a real endpoint should replace this, not a bigger loop.
 */
export function PaymentHistoryView(): React.JSX.Element {
  const { userId } = useAccount();
  const history = useOrderHistory(userId, 0, false);
  const orders = history.data?.items ?? [];

  const paymentQueries = useQueries({
    queries: orders.map((order) => ({
      queryKey: ["order-payments", order.id],
      // Same key the tracking screen uses, so a payment read there is reused.
      queryFn: () => services.orders.listPayments(order.id),
    })),
  });

  const isLoading =
    history.isPending || paymentQueries.some((query) => query.isPending);

  // Cheap enough to derive every render: this is one page of orders, and a
  // memo keyed on an array of query results is more trouble than it saves.
  //
  // Grouped by order: a declined card and the UPI that went through after it
  // are one purchase, and listing them as two rows made #664 look paid twice.
  const groups: readonly OrderPayments[] = orders
    .map((order, index) => ({
      orderId: order.id,
      attempts: [...(paymentQueries[index]?.data?.items ?? [])].sort(byStanding),
    }))
    .filter((group) => group.attempts.length > 0)
    .sort((left, right) => newestFirst(left.attempts[0] as Payment, right.attempts[0] as Payment));
  const rows = groups.flatMap((group) => group.attempts);

  const capturedTotal = rows
    .filter((row) => row.status === "captured")
    .reduce((sum, row) => sum + Number.parseFloat(row.amount), 0);

  if (history.error !== null) {
    return <QueryError title="Could not load your payments" error={history.error} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageTitle subtitle="Across your recent orders">Payments</PageTitle>

      {/* Every figure here is a sum over queries still in flight, so until the
          last one answers they are not small numbers, they are wrong ones:
          "₹0.00 · 0 · 0" read as an account that had never paid. The tiles
          keep their labels and height and hold a bar where the figure goes. */}
      <StatRail ariaLabel="Your payments">
        <Stat label="Captured" value={statValue(isLoading, formatMoney(capturedTotal))} />
        <Stat label="Attempts" value={statValue(isLoading, String(rows.length))} />
        <Stat label="Orders" value={statValue(isLoading, String(orders.length))} />
      </StatRail>

      {isLoading ? (
        <LoadingLines count={4} label="Loading payments" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No payments yet"
          detail="Once you pay for an order, every attempt on it is listed here."
        />
      ) : (
        <Card>
          <CardBody>
            <ul className="flex flex-col divide-y divide-line">
              {groups.map((group) => (
                <OrderPaymentsRow key={group.orderId} group={group} />
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {history.data !== undefined && history.data.total > orders.length ? (
        <p className="text-[12px] text-ink-3">
          {`Showing payments for your ${orders.length} most recent orders of ${history.data.total}. Older receipts are on each order.`}
        </p>
      ) : null}
    </div>
  );
}

/** The figure, or a bar the height of the 22px figure while it is still a guess. */
function statValue(isLoading: boolean, figure: string): React.ReactNode {
  return isLoading ? (
    <Skeleton className="block h-[22px] w-16" label="Loading payments" />
  ) : (
    figure
  );
}

function OrderPaymentsRow({
  group,
}: {
  readonly group: OrderPayments;
}): React.JSX.Element | null {
  const [headline, ...others] = group.attempts;
  if (headline === undefined) return null;

  return (
    <li className="flex flex-col gap-1.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2">
          <Link
            href={`/orders/${group.orderId}`}
            className="inline-flex min-h-11 items-center text-[14px] font-semibold text-accent no-underline"
          >
            {`Order #${group.orderId}`}
          </Link>
          <Badge tone={describePayment(headline).tone}>{paymentStatusWord(headline)}</Badge>
        </div>
        <p className="shrink-0 pt-2.5 text-right text-[15px] font-semibold tabular-nums text-ink">
          {formatMoney(headline.amount)}
        </p>
      </div>
      <p className="text-[12px] text-ink-3">
        {methodLine(headline)}
        <span className="font-mono tabular-nums">{` · ${formatDateTime(headline.created_at)}`}</span>
      </p>
      {headline.failed_reason !== null ? (
        <p className="text-[12px] text-crit">{headline.failed_reason}</p>
      ) : null}

      {/* The other attempts on the same order, quietly: they answer "was I
          charged twice?" without reading as a second purchase. */}
      {others.length > 0 ? (
        <ul
          aria-label={`Other attempts on order #${group.orderId}`}
          className="mt-1 flex flex-col gap-1 border-l-2 border-line pl-3"
        >
          {others.map((attempt) => (
            <li key={attempt.id} className="text-[12px] text-ink-3">
              <span className="font-medium text-ink-2">{paymentStatusWord(attempt)}</span>
              {` · ${methodLine(attempt)} · `}
              <span className="font-mono tabular-nums">{formatDateTime(attempt.created_at)}</span>
              {attempt.failed_reason !== null ? ` — ${attempt.failed_reason}` : null}
            </li>
          ))}
        </ul>
      ) : null}

      <Link
        href={`/orders/${group.orderId}/receipt`}
        className="inline-flex min-h-11 items-center self-start text-[13px] font-medium text-accent"
      >
        Receipt
      </Link>
    </li>
  );
}
