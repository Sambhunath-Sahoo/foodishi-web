"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { isNotFound } from "@repo/api-client";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageTitle,
  Skeleton,
  StatusChip,
  Timeline,
  getOrderStatusLabel,
  getOrderStatusTone,
  type TimelineEntry,
} from "@repo/ui";
import { LoadingLines, QueryError } from "./data-states";
import { OrderNotFound } from "./order-not-found";
import { LifecycleStepper } from "./lifecycle-stepper";
import { CancelOrderControl } from "./cancel-order-control";
import { PaymentStatusCard } from "./payment-status-card";
import { PriceBreakdown } from "./price-breakdown";
import { ReviewForm } from "./review-form";
import { OrderHelpSheet, useHelpSheet } from "./order-help-sheet";
import { useDeliveryNotes } from "../lib/delivery-notes";
import { PromiseMeter } from "./promise-meter";
import { useRestaurant } from "../lib/queries/catalog";
import {
  sumCaptured,
  useOrder,
  useOrderEvents,
  useOrderPayments,
  useOrderStatus,
} from "../lib/queries/orders";
import { useAccount } from "../lib/use-account";
import { useNow } from "../lib/use-now";
import { isSettled, lifecycleHeadline } from "../lib/lifecycle";
import { describePromise, isLongOverdue, resolveDeliveredAt } from "../lib/promise-time";
import { useReviews } from "../lib/reviews";
import { formatClockAndDay, formatDateTime, formatMoney } from "../lib/format";
import type { OrderDetail, OrderEvent, Quote } from "../lib/types";
import { LineChoices } from "./line-choices";

/**
 * Tracking — the screen that matters.
 *
 * The status endpoint is polled every 10s and everything here — the step, the
 * meter, whether Cancel is even offered — comes from that answer rather than
 * from a client-side guess. Only the seconds between polls are counted here.
 *
 * One card carries the whole decision: where the order is, how the promise is
 * holding up, and the way out. Below it sit the bill and the trail, in that
 * order, because that is the order they are asked about.
 */
export function OrderTrackingView({
  orderId: rawOrderId,
}: {
  readonly orderId: string;
}): React.JSX.Element {
  const orderId = Number.parseInt(rawOrderId, 10);
  const isValidId = Number.isSafeInteger(orderId) && orderId > 0;
  const queryClient = useQueryClient();
  const { userId, displayName } = useAccount();
  const { noteForOrder } = useDeliveryNotes();
  const help = useHelpSheet();
  const reviews = useReviews();
  /**
   * Which slot the review form takes, decided ONCE, the first time storage
   * answers. Read live, posting a review flipped "unrated" to "rated" and the
   * form unmounted under the thumb and remounted ~1000px down, taking its
   * "Saved" confirmation with it.
   */
  const [reviewSlot, setReviewSlot] = React.useState<"top" | "bottom" | null>(null);
  const hasReview = reviews.forOrder(orderId) !== null;
  React.useEffect(() => {
    if (!reviews.isReady || reviewSlot !== null) return;
    setReviewSlot(hasReview ? "bottom" : "top");
  }, [reviews.isReady, reviewSlot, hasReview]);

  const order = useOrder(isValidId ? orderId : null);
  const status = useOrderStatus(isValidId ? orderId : null);
  const events = useOrderEvents(isValidId ? orderId : null, status.data?.status);
  const payments = useOrderPayments(isValidId ? orderId : null);
  const restaurant = useRestaurant(order.data?.restaurant_id ?? null);

  const live = status.data ?? undefined;
  const isLive = !isSettled(live?.status ?? order.data?.status);
  const now = useNow(isLive);

  // A cancellation lands in three places at once. Re-read them together.
  const refreshAll = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    void queryClient.invalidateQueries({ queryKey: ["order-status", orderId] });
    void queryClient.invalidateQueries({ queryKey: ["order-events", orderId] });
    void queryClient.invalidateQueries({ queryKey: ["me-orders"] });
  }, [queryClient, orderId]);

  const polledStatus = status.data?.status;
  const detailStatus = order.data?.status;

  /**
   * The order detail is fetched once; the poll is the only thing that notices
   * an order settling while this screen sits open. Everything an arrival is
   * described with — delivered_at, cancelled_at, cancellation_reason — lives on
   * the detail, so without this the meter kept counting towards a promise that
   * had already been kept and a kitchen-cancelled order showed no reason at
   * all. Re-read it on the one transition that matters, not on every tick.
   */
  React.useEffect(() => {
    if (!isSettled(polledStatus)) return;
    // Nothing to correct until the detail has answered once, and nothing to
    // correct after it already agrees the order is over.
    if (detailStatus === undefined || isSettled(detailStatus)) return;
    void queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    void queryClient.invalidateQueries({ queryKey: ["order-events", orderId] });
    void queryClient.invalidateQueries({ queryKey: ["me-orders"] });
  }, [polledStatus, detailStatus, orderId, queryClient]);

  if (!isValidId) {
    return <OrderNotFound />;
  }

  if (order.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-1/2" label="Loading your order" />
        <Skeleton className="h-32 w-full" label="Loading your order" />
        <LoadingLines count={4} label="Loading your order" />
      </div>
    );
  }

  if (order.isError) {
    // A 404 is an order number that was never issued; retrying will not mint
    // it. Someone else's order is a 403, which keeps the server's own words.
    if (isNotFound(order.error)) return <OrderNotFound />;
    return (
      <QueryError
        title="Could not load this order"
        error={order.error}
        onRetry={() => void order.refetch()}
      />
    );
  }

  const detail = order.data;
  // The order's own copy wins. It is what the kitchen actually received, so
  // showing anything else would tell the customer their instruction was passed
  // on when it was not. The local copy is the fallback for orders placed before
  // `delivery_note` existed on OrderCreate, which had no way to send it.
  const deliveryNote = detail.delivery_note ?? noteForOrder(detail.id);
  const currentStatus = live?.status ?? detail.status;
  const isCancelled = currentStatus === "cancelled";
  const hasSettled = isSettled(currentStatus);
  const isDelivered = currentStatus === "delivered";
  /**
   * The arrival is read off the trail printed lower down, so the meter, the
   * stepper and the trail state one time (lib/promise-time.ts,
   * resolveDeliveredAt). The trail lands after the detail — and right after
   * the poll flips to delivered it is still the previous status's copy — so
   * until it answers the arrival is held back rather than shown from
   * delivered_at and then corrected under the customer's eye.
   */
  const isArrivalPending = isDelivered && (events.isPending || events.isPlaceholderData);
  const deliveredAt = resolveDeliveredAt(
    events.isSuccess ? events.data : undefined,
    detail.delivered_at,
  );
  const promise = describePromise({
    placedAt: detail.placed_at,
    promisedAt: detail.promised_at,
    now,
    deliveredAt,
    isSettled: hasSettled,
  });
  // The server's own verdict wins while the order is live; the clock only
  // fills the gap between polls.
  const isLate = (live?.is_late ?? promise.kind === "overdue") && !hasSettled;
  /**
   * Hours past the promise and still open: treated as an order that did not
   * arrive. The meter's "44d 19h late" and "the kitchen is still on it" are
   * replaced by the promise itself and the way to a person. Judged on the
   * clock against promised_at, so a fresh order an hour late keeps the meter.
   */
  const isStale = isLongOverdue({
    promisedAt: detail.promised_at,
    now,
    isSettled: hasSettled,
  });
  // The review leads a delivered, unrated order — it is the one thing left to
  // do — and sits at the bottom when there is already a review to edit.
  // Storage is read after mount, so neither slot renders until it answers.
  const isUnrated = reviewSlot === "top";
  const reviewForm =
    isDelivered && reviewSlot !== null ? (
      <ReviewForm
        orderId={detail.id}
        restaurantId={detail.restaurant_id}
        restaurantName={restaurant.data?.name ?? `Restaurant #${detail.restaurant_id}`}
        authorName={displayName ?? "You"}
      />
    ) : null;

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-col gap-1.5">
        <PageTitle subtitle={restaurant.data?.name ?? "Loading the kitchen…"}>
          {lifecycleHeadline(currentStatus, isLate, isStale)}
        </PageTitle>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusChip
            status={isLate || isStale ? "late" : currentStatus}
            label={isStale ? "Not arrived" : isLate ? "Running late" : undefined}
          />
          <span className="font-mono text-[12px] tabular-nums text-ink-3">
            #{detail.id}
          </span>
          <span aria-hidden="true" className="text-ink-4">
            ·
          </span>
          <span className="font-mono text-[12px] tabular-nums text-ink-3">
            placed {formatDateTime(detail.placed_at)}
          </span>
        </div>
      </header>

      {status.isError ? (
        <QueryError
          title="Live tracking paused"
          error={status.error}
          onRetry={() => void status.refetch()}
        />
      ) : null}

      {isCancelled ? (
        <Card stripe="crit" className="px-4 py-3">
          <p className="text-[15px] font-semibold text-ink">
            This order was cancelled
          </p>
          {detail.cancellation_reason !== null ? (
            <p className="mt-1 text-[15px] leading-snug text-ink-2">
              {detail.cancellation_reason}
            </p>
          ) : null}
          {detail.cancelled_at !== null ? (
            <p className="mt-1 font-mono text-[12px] tabular-nums text-ink-3">
              {formatDateTime(detail.cancelled_at)}
            </p>
          ) : null}
        </Card>
      ) : (
        /* Progress, promise and the way out, in one card — the whole decision
           without a scroll. */
        <Card>
          <div className="px-4 pt-3.5 pb-3">
            <LifecycleStepper
              status={currentStatus}
              deliveredAt={isArrivalPending ? null : deliveredAt}
            />
          </div>
          <div className="border-t border-line px-4 py-3.5">
            {isStale ? (
              // The promise, stated once. No counter and no bar: a number
              // that only grows tells the customer nothing they can act on.
              <p className="font-mono text-[13px] tabular-nums text-ink-2">
                Promised by {formatClockAndDay(detail.promised_at)}
              </p>
            ) : isArrivalPending ? (
              <Skeleton className="h-4 w-3/4" label="Loading when it arrived" />
            ) : (
              <PromiseMeter state={promise} />
            )}
          </div>
          {!hasSettled ? (
            <div className="flex flex-col gap-2 border-t border-line px-4 py-3">
              {/* Past the point of waiting, help is the main action and the
                  cancel — outlined, with its consequence — sits under it. */}
              {isStale ? (
                <Button block size="lg" className="sm:w-full" onClick={help.open}>
                  Get help with this order
                </Button>
              ) : null}
              <CancelOrderControl
                orderId={detail.id}
                userId={userId}
                isCancellable={live?.is_cancellable ?? false}
                cancellableUntil={detail.cancellable_until}
                totalAmount={detail.total_amount}
                capturedAmount={sumCaptured(payments.data)}
                cancellationFeePercent={
                  restaurant.data?.policy?.cancellation_fee_percent
                }
                now={now}
                onCancelled={refreshAll}
              />
            </div>
          ) : null}
        </Card>
      )}

      {isUnrated ? reviewForm : null}

      <Card>
        <CardHeader className="py-2.5">
          <CardTitle>What you ordered</CardTitle>
          <span className="text-[12px] tabular-nums text-ink-3">
            {detail.items.length} {detail.items.length === 1 ? "dish" : "dishes"}
          </span>
        </CardHeader>
        <ul className="flex flex-col">
          {detail.items.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2 last:border-b-0"
            >
              <span className="flex min-w-0 flex-col">
                <span className="min-w-0 truncate text-[15px] text-ink">
                  {item.item_name}
                  <span className="ml-1.5 tabular-nums text-ink-3">
                    × {item.quantity}
                  </span>
                </span>
                <LineChoices modifiers={item.modifiers} />
                {/* What one costs, when the line is more than one — the frozen
                    unit price off the order, not a division of the total. */}
                {item.quantity > 1 ? (
                  <span className="font-mono text-[11px] tabular-nums text-ink-3">
                    {formatMoney(item.unit_price)} each
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-[15px] tabular-nums text-ink-2">
                {formatMoney(item.line_total)}
              </span>
            </li>
          ))}
        </ul>
        <CardBody className="border-t border-line px-4 py-3">
          <PriceBreakdown quote={toBreakdown(detail)} />
        </CardBody>
      </Card>

      {deliveryNote !== null ? (
        <Card>
          <CardHeader className="py-2.5">
            <CardTitle>Your delivery note</CardTitle>
          </CardHeader>
          <CardBody className="py-3">
            <p className="text-[14px] leading-relaxed text-ink-2">{deliveryNote}</p>
            {/* Branched on provenance, because the two cases are genuinely
                different and this used to assert the device-only one for both.
                delivery_note came back FROM the server, so the kitchen has it;
                the noteForOrder() fallback is a note from before the field
                shipped and really is device-only. Saying "the kitchen has not
                been sent it" over a note the API had just stored sent customers
                to the phone to repeat instructions that were already on the
                ticket. */}
            <p className="mt-1.5 text-[12px] text-ink-3">
              {detail.delivery_note !== null
                ? "Sent with your order — the kitchen and your rider both see this."
                : "Saved on this device before delivery notes reached the kitchen, so it was not sent with this order."}
            </p>
          </CardBody>
        </Card>
      ) : null}

      <PaymentStatusCard
        orderId={detail.id}
        totalAmount={detail.total_amount}
        orderStatus={currentStatus}
        payments={payments.data}
        isPending={payments.isPending}
        error={payments.error}
        onRetry={() => void payments.refetch()}
        onAttempted={() => void payments.refetch()}
      />

      <Card>
        <CardHeader className="py-2.5">
          <CardTitle>Status trail</CardTitle>
          {events.isSuccess && events.data.length > 0 ? (
            <span className="text-[12px] tabular-nums text-ink-3">
              {events.data.length} {events.data.length === 1 ? "change" : "changes"}
            </span>
          ) : null}
        </CardHeader>
        <CardBody className="py-3">
          {events.isPending ? (
            <LoadingLines count={3} label="Loading the status trail" />
          ) : events.isError ? (
            <QueryError
              title="Could not load the status trail"
              error={events.error}
              onRetry={() => void events.refetch()}
            />
          ) : events.data.length === 0 ? (
            <p className="text-[15px] leading-snug text-ink-3">
              Every status change writes a row here — accepted, cooking, out for
              delivery — with who made it and when.
            </p>
          ) : (
            <Timeline entries={events.data.map(toTimelineEntry)} />
          )}
        </CardBody>
      </Card>

      {!isUnrated ? reviewForm : null}

      {/* Help is a sheet, not a form left open on every order. A stale order
          already offers it, filled, at the top; this is the quiet way in. */}
      {!isStale ? (
        <Button variant="outline" block size="lg" className="sm:w-full" onClick={help.open}>
          Get help with this order
        </Button>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-5">
        <Link
          href={`/orders/${detail.id}/receipt`}
          className="inline-flex min-h-11 items-center text-[14px] font-medium text-accent"
        >
          Receipt
        </Link>
        <Link
          href="/orders"
          className="inline-flex min-h-11 items-center text-[14px] font-medium text-accent"
        >
          All your orders
        </Link>
      </div>

      <OrderHelpSheet
        open={help.isOpen}
        onClose={help.close}
        orderId={detail.id}
        summary={
          isStale
            ? `Promised by ${formatClockAndDay(detail.promised_at)} and still not delivered. Get in touch and we will chase the kitchen for you.`
            : undefined
        }
      />
    </div>
  );
}

/**
 * The order carries the same money fields the quote did, so the placed order
 * reuses the breakdown component rather than a second, drifting copy.
 */
function toBreakdown(order: OrderDetail): Quote {
  return {
    lines: order.items.map((item) => ({
      menu_item_id: item.menu_item_id,
      item_name: item.item_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      line_total: item.line_total,
      modifiers: item.modifiers,
    })),
    subtotal: order.subtotal,
    packaging_fee: order.packaging_fee,
    delivery_fee: order.delivery_fee,
    tax_amount: order.tax_amount,
    discount_amount: order.discount_amount,
    total_amount: order.total_amount,
    distance_km: order.distance_km,
    promised_at: order.promised_at,
    cancellable_until: order.cancellable_until,
    coupon_code: null,
    coupon_message: null,
  };
}

function toTimelineEntry(event: OrderEvent): TimelineEntry {
  return {
    id: String(event.id),
    label: getOrderStatusLabel(event.to_status),
    timestamp: formatDateTime(event.created_at),
    actor: event.actor_type,
    detail: event.reason ?? undefined,
    tone: getOrderStatusTone(event.to_status),
  };
}
