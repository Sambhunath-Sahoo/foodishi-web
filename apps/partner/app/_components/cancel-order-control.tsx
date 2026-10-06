"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { Button, Dialog, ErrorBanner, Field, Select } from "@repo/ui";
import { RefusedNote } from "./states";
import { formatClock, formatDuration, formatMoney, minutesSince } from "../_lib/format";
import { PERMISSION_LABELS, ROLE_LABELS } from "../../lib/permissions";
import {
  useCancelOrderMutation,
  useRejectOrderMutation,
} from "../../lib/queries/orders";
import type { ReadyKitchen } from "../../lib/kitchen";
import { canRestaurantCancel } from "../../lib/order-flow";
import type { CancelResult, Order, Permission } from "../../lib/types";

/**
 * A pending order has not been accepted: nothing is in the pans and nobody is
 * waiting on food, so refusing it is a REJECTION — the opposite of the accept
 * button beside it, and its own call on the server. Once the order is confirmed
 * or cooking, the same refusal abandons a promise already made, which is a
 * CANCELLATION and says so.
 *
 * They are also two different permissions, and a kitchen can grant one without
 * the other. That is the "if permitted" in the brief, made real.
 */
type Refusal = "reject" | "cancel";

interface ReasonOption {
  readonly value: string;
  readonly label: string;
}

/** Why a kitchen turns an order down before it ever accepts it. */
const REJECT_REASONS: readonly ReasonOption[] = [
  { value: "Kitchen is at capacity", label: "Kitchen is at capacity" },
  {
    value: "An item on this order is out of stock",
    label: "An item on this order is out of stock",
  },
  { value: "Cannot make the promised time", label: "Cannot make the promised time" },
  { value: "Closing early tonight", label: "Closing early tonight" },
];

/** Why a kitchen drops an order it had already taken on. */
const CANCEL_REASONS: readonly ReasonOption[] = [
  { value: "Kitchen is at capacity", label: "Kitchen is at capacity" },
  { value: "An item is out of stock", label: "An item is out of stock" },
  { value: "Closing early tonight", label: "Closing early tonight" },
  { value: "Customer asked us to cancel", label: "Customer asked us to cancel" },
];

const FALLBACK_REASON = "Kitchen is at capacity";

function readRefusal(status: string): Refusal {
  return status === "pending" ? "reject" : "cancel";
}

function reasonsFor(refusal: Refusal): readonly ReasonOption[] {
  return refusal === "reject" ? REJECT_REASONS : CANCEL_REASONS;
}

function permissionFor(refusal: Refusal): Permission {
  return refusal === "reject" ? "orders.reject" : "orders.cancel";
}

const REFUSAL_PERMISSIONS: readonly Permission[] = ["orders.reject", "orders.cancel"];

/** A refusal this ticket could take, but that the signed-in role may not make. */
function refusalWithheld(order: Order, kitchen: ReadyKitchen): Permission | null {
  if (!canRestaurantCancel(order.status)) return null;
  const permission = permissionFor(readRefusal(order.status));
  return kitchen.can(permission) ? null : permission;
}

/**
 * Said once above a list, instead of once per card.
 *
 * The same refusal on all eight tickets of a staff member's queue was eight
 * grey boxes saying one standing fact, each the height of a button — so the
 * cards drop it and keep the button simply absent, and this line names why.
 * Nothing at all when every ticket's refusal is the reader's to make.
 */
export function RefusalScopeNote({
  orders,
  kitchen,
}: {
  readonly orders: readonly Order[];
  readonly kitchen: ReadyKitchen;
}): React.JSX.Element | null {
  const withheld = new Set(
    orders
      .map((order) => refusalWithheld(order, kitchen))
      .filter((permission): permission is Permission => permission !== null),
  );
  if (withheld.size === 0) return null;
  // Ladder order, not encounter order, so the sentence never reshuffles as
  // tickets move.
  const needs = REFUSAL_PERMISSIONS.filter((permission) => withheld.has(permission)).map(
    (permission) => PERMISSION_LABELS[permission].toLowerCase(),
  );

  return (
    <p role="note" className="text-[13px] leading-snug text-ink-3">
      <span className="font-medium text-ink-2">Some steps here are a manager&apos;s to do</span>{" "}
      — turning a ticket away needs permission to {needs.join(" and ")}, and you are signed in
      as {ROLE_LABELS[kitchen.role].toLowerCase()}. A manager here can do it, or grant it to you
      from the Team screen.
    </p>
  );
}

/**
 * The kitchen's own staff ordering their own dinner. A customer's cancellation
 * fee is real, so that one ticket cannot be promised a full refund before the
 * tap. Rejecting is still free: that call is the restaurant's by definition.
 */
function isOwnOrder(order: Order, kitchen: ReadyKitchen): boolean {
  return order.user_id === kitchen.actorId;
}

interface Consequence {
  /** Goes on the button, before the tap. */
  readonly trigger: string;
  /** Goes in the dialog, spelled out. */
  readonly detail: string;
}

/* The order total is NOT the refund.
 *
 * A refund is whatever was actually captured, and a pending order whose payment
 * never went through refunds nothing at all however large its total. Promising
 * "₹1,240 refunded in full" on a ticket the customer has not paid for is a lie
 * told to the cook, and one they would repeat to the customer.
 *
 * So neither builder below puts a number on the button. They state the RULE,
 * which is knowable before the tap — a kitchen's refusal never carries the
 * cancellation fee — and the real figure comes back once the source has
 * decided it. The order total still appears, labelled as the order's value
 * rather than as money owed back.
 */
function describeReject(order: Order, now: number): Consequence {
  const total = formatMoney(order.total_amount);
  const waited = formatDuration(minutesSince(order.placed_at, now));

  return {
    trigger: `Reject #${order.id} — no fee to the customer`,
    detail: `Order #${order.id} has waited ${waited} and has not been accepted, so nothing has been cooked. Rejecting it ends the order, and anything the customer has already paid on this ${total} order is returned to them in full: a kitchen's refusal never carries the cancellation fee, however long the ticket sat here. If the payment had not gone through yet there is nothing to return. The exact amount is shown here once it is settled.`,
  };
}

function describeCancel(order: Order, now: number): Consequence {
  const total = formatMoney(order.total_amount);
  const waited = formatDuration(minutesSince(order.placed_at, now));
  const promise = formatClock(order.promised_at);

  return {
    trigger: `Can't fulfil #${order.id} — no fee to the customer`,
    detail: `Order #${order.id} was accepted and the customer has been waiting ${waited} for food promised by ${promise}. Cancelling ends it and returns whatever they have paid on this ${total} order — the cancellation fee is charged only when a customer changes their own mind, never for a kitchen's own withdrawal. It is still a broken promise, so say why.`,
  };
}

/** The kitchen's own order: this cancellation is the customer's, fee and all. */
function describeCancelOwn(order: Order): Consequence {
  return {
    trigger: `Can't fulfil #${order.id} — your own order`,
    detail: `Order #${order.id} was placed by the account signed in here, so cancelling it counts as the customer changing their mind: the restaurant's cancellation fee applies exactly as it would to anyone else once the free window at ${formatClock(order.cancellable_until)} has passed. The fee and the refund are shown here once it goes through.`,
  };
}

function describeConsequence(
  order: Order,
  refusal: Refusal,
  ownOrder: boolean,
  now: number,
): Consequence {
  if (refusal === "reject") return describeReject(order, now);
  return ownOrder ? describeCancelOwn(order) : describeCancel(order, now);
}

interface RefusalWords {
  readonly question: string;
  readonly done: string;
  readonly confirm: string;
  readonly pendingLabel: string;
  readonly refused: string;
}

function wordsFor(refusal: Refusal, orderId: number): RefusalWords {
  if (refusal === "reject") {
    return {
      question: `Reject order #${orderId}?`,
      done: `Order #${orderId} rejected`,
      confirm: "Reject the order",
      pendingLabel: "Rejecting…",
      refused: "The rejection was refused",
    };
  }
  return {
    question: `Cancel order #${orderId}?`,
    done: `Order #${orderId} cancelled`,
    confirm: "Cancel the order",
    pendingLabel: "Cancelling…",
    refused: "The cancellation was refused",
  };
}

function ResultSummary({ result }: { readonly result: CancelResult }): React.JSX.Element {
  return (
    <dl className="flex flex-col gap-2 text-[14px]">
      <div className="flex justify-between gap-4">
        <dt className="text-ink-3">Inside the free window</dt>
        <dd className="font-medium text-ink">{result.within_window ? "Yes" : "No"}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-ink-3">Cancellation fee</dt>
        <dd className="font-mono tabular-nums text-ink">
          {formatMoney(result.cancellation_fee)}
        </dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-ink-3">Refunded to the customer</dt>
        <dd className="font-mono tabular-nums text-ink">
          {formatMoney(result.refund_amount)}
        </dd>
      </div>
      {result.refund_due_at !== null ? (
        <div className="flex justify-between gap-4">
          <dt className="text-ink-3">Refund due by</dt>
          <dd className="font-mono tabular-nums text-ink">
            {formatClock(result.refund_due_at)}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

export interface CancelOrderControlProps {
  readonly order: Order;
  readonly kitchen: ReadyKitchen;
  readonly now: number;
  /**
   * On a queue card the refusal is a full-width button under the primary
   * action. On the detail screen it sits in a row of controls.
   */
  readonly block?: boolean;
  /**
   * Whether a missing permission is explained here. A queue card says false:
   * its list carries one `RefusalScopeNote` for every card instead.
   */
  readonly explainsRefusal?: boolean;
}

/**
 * Saying no to a ticket: reject the ones the kitchen never took on, cancel the
 * ones it did.
 *
 * Both cost the customer their dinner, so the consequence is on the button
 * before the tap and the source's own figures are shown afterwards rather than
 * assumed. Outlined, never filled — the button next to it is the one tapped
 * forty times an hour.
 */
export function CancelOrderControl({
  order,
  kitchen,
  now,
  block = true,
  explainsRefusal = true,
}: CancelOrderControlProps): React.JSX.Element | null {
  const [isOpen, setIsOpen] = React.useState(false);
  const [chosenReason, setChosenReason] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CancelResult | null>(null);

  const refusal = readRefusal(order.status);
  const reasons = reasonsFor(refusal);
  const words = wordsFor(refusal, order.id);
  const permission = permissionFor(refusal);

  const reject = useRejectOrderMutation(kitchen, order.id);
  const cancel = useCancelOrderMutation(kitchen, order.id);
  const mutation = refusal === "reject" ? reject : cancel;

  // A ticket accepted while this card is on screen swaps the reason list under
  // the dialog, so the choice is checked against the list actually on offer
  // rather than sent blind.
  const reason =
    reasons.find((option) => option.value === chosenReason)?.value ??
    reasons[0]?.value ??
    FALLBACK_REASON;

  if (!kitchen.can(permission)) {
    if (!explainsRefusal) return null;
    return (
      <RefusedNote
        title={
          refusal === "reject"
            ? "Turning an order away is not yours to do"
            : "Cancelling an accepted order is not yours to do"
        }
        detail={`This needs permission to ${PERMISSION_LABELS[permission].toLowerCase()}, and you are signed in as ${ROLE_LABELS[kitchen.role].toLowerCase()}. A manager here can do it, or grant it to you from the Team screen.`}
      />
    );
  }

  const consequence = describeConsequence(
    order,
    refusal,
    isOwnOrder(order, kitchen),
    now,
  );

  const close = (): void => {
    setIsOpen(false);
    setResult(null);
    mutation.reset();
  };

  return (
    <>
      {/* The primary's height, so the pair reads as one stack — and never
          below the 44px tap floor a wet hand on a tablet needs. It may still
          wrap in a narrow column rather than clip the consequence. */}
      <Button
        variant="danger"
        size="md"
        block={block}
        className="h-auto min-h-12 py-2 text-[15px] leading-snug whitespace-normal"
        onClick={() => setIsOpen(true)}
      >
        {consequence.trigger}
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={result === null ? words.question : words.done}
        description={result === null ? consequence.detail : undefined}
        footer={
          result === null ? (
            <>
              <Button variant="outline" className="min-h-11" onClick={close}>
                Keep the order
              </Button>
              <Button
                variant="danger"
                className="min-h-11"
                isPending={mutation.isPending}
                pendingLabel={words.pendingLabel}
                onClick={() => {
                  mutation.mutate(reason, { onSuccess: setResult });
                }}
              >
                {words.confirm}
              </Button>
            </>
          ) : (
            <Button variant="outline" className="min-h-11" onClick={close}>
              Done
            </Button>
          )
        }
      >
        {result !== null ? (
          <ResultSummary result={result} />
        ) : (
          <div className="flex flex-col gap-3">
            <Field label="Reason" htmlFor={`refusal-reason-${order.id}`}>
              <Select
                id={`refusal-reason-${order.id}`}
                options={reasons}
                value={reason}
                onChange={(event) => setChosenReason(event.target.value)}
              />
            </Field>
            {mutation.error !== null ? (
              <ErrorBanner
                title={words.refused}
                message={toUserMessage(mutation.error)}
              />
            ) : null}
          </div>
        )}
      </Dialog>
    </>
  );
}
