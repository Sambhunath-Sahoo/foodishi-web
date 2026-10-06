"use client";

import * as React from "react";
import { Button, Dialog, type OrderStatus } from "@repo/ui";
import type { DeliveryDetail, OrderDetail, PaymentRead, RefundRead } from "../lib/api-types";
import { formatMoney, formatOrderRef, toNumber } from "../lib/format";
import { useOrderDelivery, useOrderPayments, useOrderRefunds } from "../lib/queries";
import { RIDER_STATUSES } from "./live-rows";

/** Terminal states: nothing left to decide, so the drawer shows no footer. */
const TERMINAL: readonly OrderStatus[] = ["delivered", "cancelled"];

/** Payment states in which the platform is holding the customer's money. */
const HELD: readonly PaymentRead["status"][] = ["captured", "partially_refunded"];

/** Refund states that already account for money, so are not owed twice. */
const COUNTED: readonly RefundRead["status"][] = ["initiated", "processing", "completed"];

export function isOpenOrder(status: OrderStatus): boolean {
  return !TERMINAL.includes(status);
}

/**
 * What a cancel would send back: money held, less refunds already under way.
 *
 * Read from the payment rows, not `total_amount`. A cash-on-delivery order that
 * never reached the door was never paid, and "₹479.40 back" on it
 * would promise the customer money that does not exist.
 */
export function refundableAmount(
  payments: readonly PaymentRead[],
  refunds: readonly RefundRead[],
): number {
  const held = payments
    .filter((payment) => HELD.includes(payment.status))
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const already = refunds
    .filter((refund) => COUNTED.includes(refund.status))
    .reduce((sum, refund) => sum + toNumber(refund.amount), 0);
  return Math.max(0, Math.round((held - already) * 100) / 100);
}

export interface OrderFooterProps {
  readonly order: OrderDetail;
  readonly onReassign: (delivery: DeliveryDetail) => void;
  readonly onCancel: (refund: number) => void;
}

/**
 * The drawer's two decisions, pinned under it (OP-4).
 *
 * Reassign comes first and is the ordinary action. The second is worded as
 * what an operator can actually do — ask the kitchen to cancel — and is a
 * neutral outline, not crit: the API has no admin cancel route, so a red
 * "Cancel — refund ₹…" promised a destructive step this console cannot take.
 * It still states the money before the tap. Both are always present on a live
 * order, disabled with the reason when they cannot apply, so the footer never
 * changes shape under the reader's hand between two orders.
 */
export function OrderFooter({
  order,
  onReassign,
  onCancel,
}: OrderFooterProps): React.JSX.Element {
  const delivery = useOrderDelivery(order.id);
  const payments = useOrderPayments(order.id);
  const refunds = useOrderRefunds(order.id);

  const ride = delivery.data ?? null;
  const canHaveRider = RIDER_STATUSES.includes(order.status);
  const reassignBlocked = !canHaveRider
    ? "A rider is attached when the order is ready for pickup."
    : delivery.isPending
      ? "Checking who has the ride…"
      : ride === null
        ? "Nobody has been assigned this ride yet, so there is no one to replace."
        : null;

  const isMoneyKnown = payments.data !== undefined && refunds.data !== undefined;
  const refund = isMoneyKnown
    ? refundableAmount(payments.data.items, refunds.data.items)
    : null;
  const cancelLabel =
    refund === null
      ? "Ask kitchen to cancel…"
      : refund > 0
        ? `Ask kitchen to cancel — ${formatMoney(refund)} back`
        : "Ask kitchen to cancel — nothing was paid";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={reassignBlocked !== null}
          title={reassignBlocked ?? `Hand ${formatOrderRef(order.id)} to another rider`}
          onClick={() => {
            if (ride !== null) onReassign(ride);
          }}
        >
          Reassign rider
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={refund === null}
          title={
            refund === null
              ? "Reading what was paid…"
              : "Explains who can cancel this order and what goes back. Nothing is cancelled from here."
          }
          onClick={() => {
            if (refund !== null) onCancel(refund);
          }}
        >
          {cancelLabel}
        </Button>
      </div>
      {reassignBlocked === null || !canHaveRider ? null : (
        <p className="font-sans text-[12px] text-ink-3">{reassignBlocked}</p>
      )}
    </div>
  );
}

export interface CancelOrderDialogProps {
  readonly order: OrderDetail | null;
  readonly refund: number;
  readonly onClose: () => void;
}

/**
 * What "Ask kitchen to cancel" opens: who can cancel, and what goes back.
 *
 * `POST /orders/{id}/cancel` admits the customer who placed the order and the
 * kitchen cooking it, and refuses platform staff on purpose (foodishi-api
 * routers/orders.py), and there is no admin cancel route. So this is not a
 * confirmation: it used to be titled "Cancel #X?" over a red confirm that
 * could only ever be disabled — a destructive step promised, then withheld.
 * Now it tells the operator what to ask the kitchen for, with the real refund
 * figure to quote, and its one button closes it. When the API grows the route
 * the confirm comes back here.
 */
export function CancelOrderDialog({
  order,
  refund,
  onClose,
}: CancelOrderDialogProps): React.JSX.Element {
  const ref = order === null ? "" : formatOrderRef(order.id);
  const money =
    refund > 0
      ? `Once it is, ${formatMoney(refund)} goes back to the customer`
      : "Nothing was paid, so nothing goes back";

  return (
    <Dialog
      open={order !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Ask the kitchen to cancel ${ref}`}
      description={`Only the kitchen cooking it, or the customer who placed it, can cancel ${ref}. ${money}.`}
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <p className="rounded-card border border-line-2 bg-surface-2 px-3 py-2 font-sans text-[13px] text-ink-2">
        This console cannot cancel {ref}: the server does not accept a cancel
        from platform staff. Ask the kitchen to cancel it from the partner app
        and quote {ref} — the refund follows automatically.
      </p>
    </Dialog>
  );
}
