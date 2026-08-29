"use client";

import * as React from "react";
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, ErrorBanner } from "@repo/ui";
import { toUserMessage } from "@repo/api-client";
import { LoadingLines, QueryError } from "./data-states";
import { PaymentMethodPicker } from "./payment-method-picker";
import { useCreatePayment } from "../lib/queries/orders";
import {
  DEFAULT_PAYMENT_METHOD,
  describePayment,
  isCashOnDelivery,
  paymentMethodLabel,
  paymentStanding,
  type PaymentMethod,
} from "../lib/payment";
import { formatDateTime, formatMoney, formatMoneyShort } from "../lib/format";
import type { Page, Payment } from "../lib/types";

/**
 * One attempt to collect, written up as it stands.
 *
 * Every attempt is listed, failures included: "was I charged twice?" is only
 * answerable if nothing is hidden, which is the same reason the API returns
 * them all (app/routers/payments.py::list_order_payments).
 */
export function PaymentRow({
  payment,
}: {
  readonly payment: Payment;
}): React.JSX.Element {
  const presentation = describePayment(payment);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Badge tone={presentation.tone}>{presentation.headline}</Badge>
        <span className="font-mono text-[11px] tabular-nums text-ink-3">
          {formatDateTime(payment.created_at)}
        </span>
      </div>
      <p className="text-[13px] leading-snug text-ink-2">{presentation.detail}</p>
      {/* The provider reference is what support asks for, so it is shown
          rather than kept for the network tab. break-all because a gateway ref
          is one long word and the page never scrolls sideways (DESIGN.md #4). */}
      <p className="font-mono text-[11px] break-all text-ink-3">
        {paymentMethodLabel(payment.method)} · {payment.provider_ref ?? "no reference yet"}
      </p>
    </div>
  );
}

function payButtonLabel(method: PaymentMethod, amount: string): string {
  // The consequence, with the real number, before the tap (DESIGN.md copy #1).
  return isCashOnDelivery(method)
    ? `Confirm ${formatMoneyShort(amount)} on delivery`
    : `Authorize ${formatMoneyShort(amount)}`;
}

/**
 * Pay for an order that has not been paid for — a first attempt, or another
 * one after the provider declined.
 *
 * A 409 is not a failure here: it means an attempt is already open, which is
 * what the route answers a double-tap with, so either outcome re-reads the
 * list and lets the rows above say what is actually true.
 */
function PayControl({
  orderId,
  totalAmount,
  hasFailedBefore,
  onAttempted,
}: {
  readonly orderId: number;
  readonly totalAmount: string;
  readonly hasFailedBefore: boolean;
  readonly onAttempted: () => void;
}): React.JSX.Element {
  const [method, setMethod] = React.useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD);
  const createPayment = useCreatePayment();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-snug text-ink-2">
        {hasFailedBefore
          ? `Every attempt so far was declined, so nothing has been collected. Trying another method authorizes ${formatMoney(totalAmount)}.`
          : `Nothing has been authorized for this order yet. Choosing a method holds ${formatMoney(totalAmount)}; the provider collects it when it settles.`}
      </p>

      <PaymentMethodPicker value={method} onChange={setMethod} />

      {createPayment.isError ? (
        // The server's own refusal, verbatim — it names what happened.
        <ErrorBanner title="Not authorized" message={toUserMessage(createPayment.error)} />
      ) : null}

      <Button
        block
        isPending={createPayment.isPending}
        pendingLabel="Authorizing…"
        onClick={() =>
          createPayment.mutate(
            { orderId, method },
            { onSuccess: onAttempted, onError: onAttempted },
          )
        }
      >
        {payButtonLabel(method, totalAmount)}
      </Button>
    </div>
  );
}

/**
 * The money side of one order, on the tracking screen.
 *
 * Nothing here is inferred from the order: `orders` carries no payment column
 * and cannot be given one, so the payment rows are the only answer to "is this
 * paid", and an order with no rows is honestly unpaid rather than assumed fine.
 *
 * The query lives with the caller — the tracking screen already reads it to cap
 * the cancellation-fee preview — so this card renders one answer instead of
 * fetching a second copy of it.
 */
export function PaymentStatusCard({
  orderId,
  totalAmount,
  orderStatus,
  payments,
  isPending,
  error,
  onRetry,
  onAttempted,
}: {
  readonly orderId: number;
  readonly totalAmount: string;
  /** The order's live status, so the card can say why an attempt is still open. */
  readonly orderStatus: string;
  readonly payments: Page<Payment> | undefined;
  readonly isPending: boolean;
  readonly error: unknown;
  readonly onRetry: () => void;
  readonly onAttempted: () => void;
}): React.JSX.Element {
  const rows = payments?.items ?? [];
  const standing = paymentStanding(payments);
  const isCancelled = orderStatus === "cancelled";
  const isDelivered = orderStatus === "delivered";
  const canPay = !isCancelled && (standing === "none" || standing === "failed");

  return (
    <Card>
      <CardHeader className="py-2.5">
        <CardTitle>Payment</CardTitle>
        {rows.length > 1 ? (
          <span className="text-[12px] tabular-nums text-ink-3">
            {rows.length} attempts
          </span>
        ) : null}
      </CardHeader>
      <CardBody className="flex flex-col gap-3 py-3">
        {error !== null && error !== undefined ? (
          <QueryError
            title="Could not read this order's payments"
            error={error}
            onRetry={onRetry}
          />
        ) : isPending ? (
          <LoadingLines count={1} label="Loading payments" />
        ) : null}

        {rows.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {rows.map((payment) => (
              <li
                key={payment.id}
                className="border-b border-line pb-3 last:border-b-0 last:pb-0"
              >
                <PaymentRow payment={payment} />
              </li>
            ))}
          </ul>
        ) : null}

        {canPay ? (
          <PayControl
            orderId={orderId}
            totalAmount={totalAmount}
            hasFailedBefore={standing === "failed"}
            onAttempted={onAttempted}
          />
        ) : null}

        {isDelivered && standing === "open" ? (
          // "Pay on delivery" and "waiting to settle" both stop being the whole
          // truth once the food has arrived, so say what is still outstanding.
          <p className="text-[13px] leading-snug text-ink-3">
            The food has arrived and the attempt above is still open. Settlement
            happens away from this app — a provider callback, not a tap here — so
            it can land after the delivery.
          </p>
        ) : null}

        {isCancelled && standing === "none" ? (
          <p className="text-[13px] leading-snug text-ink-3">
            This order was cancelled before anything was authorized, so there is
            nothing to collect and nothing to refund.
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
