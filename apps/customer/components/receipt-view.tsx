"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Button, Card, CardBody, PageTitle, StatusChip } from "@repo/ui";
import { isNotFound } from "@repo/api-client";
import { LoadingLines, QueryError } from "./data-states";
import { OrderNotFound } from "./order-not-found";
import { formatDateTime, formatMoney } from "../lib/format";
import { useOrder, useOrderEvents, useOrderPayments } from "../lib/queries/orders";
import { resolveDeliveredAt } from "../lib/promise-time";
import { useAccount } from "../lib/use-account";
import { paymentMethodLabel } from "../lib/payment";
import { LineChoices } from "./line-choices";

/**
 * A printable receipt for one order.
 *
 * Every figure is the stored column, never re-added here: the order rows
 * already reconcile server-side (ck_orders_total_reconciles), and a total this
 * screen computed itself could disagree with the one that was charged.
 *
 * "Download" is the browser's own print-to-PDF. A blob download is blocked in
 * a lot of embedded webviews, and print is the one path that works everywhere.
 */
export function ReceiptView({
  orderId: rawOrderId,
}: {
  readonly orderId: string;
}): React.JSX.Element {
  const { displayName, email } = useAccount();
  // Same rule as the tracking screen: the API owns what a valid id is, so an
  // unparseable one is simply never fetched rather than guessed at here.
  const parsed = Number.parseInt(rawOrderId, 10);
  const orderId = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  const order = useOrder(orderId);
  const payments = useOrderPayments(orderId);
  // The same arrival the tracking screen and its trail print, not the order
  // row's delivered_at, which can disagree with both (resolveDeliveredAt).
  const events = useOrderEvents(orderId, order.data?.status);

  if (orderId === null) return <OrderNotFound />;
  if (order.isPending) return <LoadingLines count={5} label="Loading receipt" />;
  if (order.error !== null) {
    // Same not-found as the tracking screen: a receipt is that order, printed.
    if (isNotFound(order.error)) return <OrderNotFound />;
    return (
      <QueryError
        title="Could not load that receipt"
        error={order.error}
        onRetry={() => void order.refetch()}
      />
    );
  }
  if (order.data === undefined) return <LoadingLines count={5} label="Loading receipt" />;

  const row = order.data;
  const deliveredAt = resolveDeliveredAt(
    events.isSuccess ? events.data : undefined,
    row.delivered_at,
  );
  const captured = (payments.data?.items ?? []).find(
    (payment) => payment.status === "captured",
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle subtitle={`Order #${row.id}`}>Receipt</PageTitle>
        {/* print: styles live in globals.css so the chrome drops away. */}
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" className="h-11" onClick={() => window.print()}>
            Print / save PDF
          </Button>
        </div>
      </div>

      <Card data-print-plain>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-title text-xl leading-none text-ink">Foodishi</p>
              <p className="mt-1 text-[12px] text-ink-3">Tax invoice · GST included</p>
            </div>
            <StatusChip status={row.status} />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
            <Line label="Placed" value={formatDateTime(row.placed_at)} />
            <Line
              label="Delivered"
              value={
                // Held until the trail answers, so the time never visibly
                // jumps from delivered_at to the trail's.
                row.status === "delivered" && events.isPending
                  ? "…"
                  : deliveredAt === null
                    ? "—"
                    : formatDateTime(deliveredAt)
              }
            />
            <Line label="Billed to" value={displayName ?? email ?? "—"} />
            <Line label="Order" value={`#${row.id}`} mono />
          </dl>

          <div className="border-t border-line pt-3">
            <table className="w-full text-[13px]">
              <caption className="sr-only">Items on this order</caption>
              <thead>
                <tr className="text-ink-3">
                  <th scope="col" className="pb-2 text-left font-medium">Item</th>
                  <th scope="col" className="pb-2 text-right font-medium">Qty</th>
                  <th scope="col" className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {row.items.map((item) => (
                  <tr key={item.id} className="border-t border-line">
                    <td className="py-2 pr-2 text-ink">
                      {item.item_name}
                      <LineChoices modifiers={item.modifiers} className="text-[12px]" />
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink-2">
                      {item.quantity}
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink">
                      {formatMoney(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-[13px]">
            <Total label="Item subtotal" value={row.subtotal} />
            <Total label="Packaging" value={row.packaging_fee} />
            <Total label="Delivery" value={row.delivery_fee} />
            <Total label="GST (5%)" value={row.tax_amount} />
            {Number.parseFloat(row.discount_amount) > 0 ? (
              <Total label="Discount" value={row.discount_amount} tone="ok" />
            ) : null}
            <div className="mt-1 flex items-center justify-between border-t border-line pt-2">
              <dt className="text-[14px] font-semibold text-ink">Total paid</dt>
              <dd className="text-[16px] font-semibold tabular-nums text-ink">
                {formatMoney(row.total_amount)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            {captured === undefined ? (
              <Badge tone="warn">Payment not captured</Badge>
            ) : (
              <>
                <Badge tone="ok">{`Paid by ${paymentMethodLabel(captured.method)}`}</Badge>
                <span className="font-mono text-[11px] text-ink-3">
                  {captured.provider_ref ?? captured.provider}
                </span>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      <Link
        href={`/orders/${row.id}`}
        className="inline-flex min-h-11 items-center self-start text-[13px] font-medium text-accent print:hidden"
      >
        Back to the order
      </Link>
    </div>
  );
}

function Line({
  label,
  value,
  mono = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
}): React.JSX.Element {
  return (
    <div>
      <dt className="text-ink-3">{label}</dt>
      <dd className={mono ? "font-mono text-ink" : "text-ink"}>{value}</dd>
    </div>
  );
}

function Total({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly tone?: "ok";
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd className={tone === "ok" ? "tabular-nums text-ok" : "tabular-nums text-ink"}>
        {tone === "ok" ? `−${formatMoney(value)}` : formatMoney(value)}
      </dd>
    </div>
  );
}
