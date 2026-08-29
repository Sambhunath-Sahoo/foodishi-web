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
  Stat,
  StatRail,
} from "@repo/ui";
import { LoadingLines, QueryError } from "./data-states";
import { formatDateTime, formatMoney } from "../lib/format";
import { useAccount } from "../lib/use-account";
import { useOrderHistory } from "../lib/queries/orders";
import { describePayment, paymentMethodLabel } from "../lib/payment";

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
  const rows = orders
    .flatMap((order, index) =>
      (paymentQueries[index]?.data?.items ?? []).map((payment) => ({
        payment,
        orderId: order.id,
      })),
    )
    .sort(
      (left, right) =>
        new Date(right.payment.created_at).getTime() -
        new Date(left.payment.created_at).getTime(),
    );

  const capturedTotal = rows
    .filter((row) => row.payment.status === "captured")
    .reduce((sum, row) => sum + Number.parseFloat(row.payment.amount), 0);

  if (history.error !== null) {
    return <QueryError title="Could not load your payments" error={history.error} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageTitle subtitle="Across your recent orders">Payments</PageTitle>

      <StatRail ariaLabel="Your payments">
        <Stat label="Captured" value={formatMoney(capturedTotal)} />
        <Stat label="Attempts" value={String(rows.length)} />
        <Stat label="Orders" value={String(orders.length)} />
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
              {rows.map(({ payment, orderId }) => (
                <li key={payment.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/orders/${orderId}`}
                        className="text-[14px] font-semibold text-accent no-underline"
                      >
                        {`Order #${orderId}`}
                      </Link>
                      <Badge tone={describePayment(payment).tone}>
                        {describePayment(payment).headline}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[12px] text-ink-3">
                      {`${paymentMethodLabel(payment.method)} · ${payment.provider}`}
                    </p>
                    <p className="mt-0.5 text-[12px] tabular-nums text-ink-3">
                      {formatDateTime(payment.created_at)}
                    </p>
                    {payment.failed_reason !== null ? (
                      <p className="mt-1 text-[12px] text-crit">
                        {payment.failed_reason}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-semibold tabular-nums text-ink">
                      {formatMoney(payment.amount)}
                    </p>
                    <Link
                      href={`/orders/${orderId}/receipt`}
                      className="text-[12px] font-medium text-accent"
                    >
                      Receipt
                    </Link>
                  </div>
                </li>
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
