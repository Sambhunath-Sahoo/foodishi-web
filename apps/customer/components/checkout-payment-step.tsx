"use client";

import * as React from "react";
import Link from "next/link";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorBanner,
  PageTitle,
  buttonVariants,
  cn,
} from "@repo/ui";
import { toUserMessage } from "@repo/api-client";
import { LoadingLines, QueryError } from "./data-states";
import { PaymentRow } from "./payment-status-card";
import { useCreatePayment, useOrderPayments } from "../lib/queries/orders";
import { isCashOnDelivery, paymentMethodLabel, type PaymentMethod } from "../lib/payment";
import { formatMoney, formatTimeOnly } from "../lib/format";
import type { OrderDetail } from "../lib/types";

/**
 * The payment step: what happens to the money, immediately after the order
 * exists.
 *
 * It is a step of its own rather than a spinner on the way to /orders/{id}
 * because the two halves can part company. POST /orders creates the order;
 * POST /orders/{id}/payments authorizes the amount. The second one can be
 * refused while the first stands, and a customer whose kitchen is already
 * cooking needs to be told that in those words rather than dropped on a
 * tracking screen that quietly says nothing about money.
 *
 * What it never claims is that the order is paid. The mock provider only
 * authorizes; a row becomes `captured` through the gateway callback, which is
 * behind a shared secret this app does not and must not hold. So the wording
 * comes from lib/payment.ts and stops at "held".
 */
export function CheckoutPaymentStep({
  order,
  kitchenName,
  method,
}: {
  readonly order: OrderDetail;
  readonly kitchenName: string | null;
  readonly method: PaymentMethod;
}): React.JSX.Element {
  const {
    mutate: authorize,
    isPending,
    isError,
    error,
    data: created,
  } = useCreatePayment();
  const payments = useOrderPayments(order.id);
  const refetchPayments = payments.refetch;

  /**
   * Authorize once, as soon as this step mounts — the tap on "Place order"
   * was the consent, and asking for a second tap would leave a placed order
   * looking unpaid for no reason. The ref, not the mutation's own state, is
   * the guard: it survives the effect being re-run and cannot authorize twice.
   */
  const hasStarted = React.useRef(false);
  React.useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    authorize(
      { orderId: order.id, method },
      // Either way the list is re-read: a 409 means an attempt is already
      // open, which is an answer, not a failure to pay.
      { onSettled: () => void refetchPayments() },
    );
  }, [authorize, method, order.id, refetchPayments]);

  /**
   * The list is the truth — it includes an attempt that already existed, which
   * is what a 409 means — but the row the authorization itself returned stands
   * in while that GET is still in the air, so a customer who has just paid is
   * never shown a blank card.
   */
  const listed = payments.data?.items ?? [];
  const rows = listed.length > 0 ? listed : created === undefined ? [] : [created];
  const trackHref = `/orders/${order.id}`;

  return (
    <div className="flex flex-col gap-4">
      <PageTitle subtitle={kitchenName ?? undefined}>
        Order #{order.id} placed
      </PageTitle>

      <Card stripe="cool" className="px-4 py-3">
        <p className="text-[15px] leading-snug text-ink-2">
          {kitchenName ?? "The kitchen"} has it, promised by{" "}
          <span className="font-mono tabular-nums text-ink">
            {formatTimeOnly(order.promised_at)}
          </span>
          .
        </p>
      </Card>

      <Card>
        <CardHeader className="py-2.5">
          <CardTitle>Payment</CardTitle>
          <span className="font-mono text-[12px] tabular-nums text-ink-3">
            {formatMoney(order.total_amount)}
          </span>
        </CardHeader>
        <CardBody className="flex flex-col gap-3 py-3">
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
          ) : isPending ? (
            <p aria-live="polite" className="text-[15px] leading-snug text-ink-2">
              {isCashOnDelivery(method)
                ? `Recording ${formatMoney(order.total_amount)} to be collected on delivery…`
                : `Authorizing ${formatMoney(order.total_amount)} with the provider…`}
            </p>
          ) : isError ? (
            <>
              {/* The order stands either way, which is the first thing to say:
                  a refused authorization is not a refused dinner. */}
              <ErrorBanner
                title="Payment not authorized"
                message={toUserMessage(error)}
              />
              <p className="text-[13px] leading-snug text-ink-2">
                Order #{order.id} is placed and the kitchen has it — nothing about
                that depends on this. Try {paymentMethodLabel(method)} again, or open
                the order to pay another way.
              </p>
              <Button
                block
                size="lg"
                variant="outline"
                className="sm:w-full"
                onClick={() =>
                  authorize(
                    { orderId: order.id, method },
                    { onSettled: () => void refetchPayments() },
                  )
                }
              >
                Try the payment again
              </Button>
            </>
          ) : payments.isError ? (
            // The authorization went through; reading it back did not.
            <QueryError
              title="Could not read this order's payment"
              error={payments.error}
              onRetry={() => void refetchPayments()}
            />
          ) : (
            <LoadingLines count={1} label="Loading payment" />
          )}
        </CardBody>
      </Card>

      <Link
        href={trackHref}
        className={cn(buttonVariants({ size: "lg", block: true }), "no-underline sm:w-full")}
      >
        Track order #{order.id}
      </Link>
    </div>
  );
}
