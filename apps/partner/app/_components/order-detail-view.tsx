"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  PageTitle,
  Skeleton,
  StatusChip,
  Timeline,
  cn,
  getOrderStatusLabel,
  getOrderStatusTone,
  type TimelineEntry,
} from "@repo/ui";
import { CancelOrderControl } from "./cancel-order-control";
import { KitchenGate } from "./kitchen-gate";
import { NextAction } from "./next-action";
import { OrderClock, settledAtOf } from "./order-clock";
import { OrderItems } from "./order-items";
import { CardSkeletons, EmptyCard, LoadError } from "./states";
import { TicketCard } from "./ticket-card";
import { formatClock, formatMoney, formatSignedMoney } from "../_lib/format";
import { readLateness } from "../_lib/lateness";
import { isPermanentRefusal } from "../_lib/refusal";
import { TICK_DETAIL_MS, useNow } from "../_lib/use-now";
import { canRestaurantCancel } from "../../lib/order-flow";
import { useDishFaces } from "../../lib/queries/menu";
import { useCoupons } from "../../lib/queries/offers";
import {
  useAddress,
  useCustomer,
  useOrder,
  useOrderClock,
  useOrderEvents,
} from "../../lib/queries/orders";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { Address, OrderDetail, OrderEvent } from "../../lib/types";

/**
 * Which restaurant this tablet has open, not who may read the ticket — the
 * source settles that and refuses an order belonging to a restaurant the caller
 * does not work in. What it cannot know is that this tablet is standing in one
 * kitchen while somebody types an id from another they also work in, so the
 * ticket is matched against the open restaurant before a single line, address
 * or phone number is drawn.
 */
function belongsToKitchen(order: OrderDetail, kitchen: ReadyKitchen): boolean {
  return order.restaurant_id === kitchen.restaurantKey;
}

/** Who moved it, in kitchen words rather than the wire's actor names. */
const ACTOR_WORDS: Record<string, string> = {
  user: "customer",
  restaurant: "this restaurant",
  system: "the platform",
  agent: "support",
};

function toTimeline(events: readonly OrderEvent[], now: number): readonly TimelineEntry[] {
  return events.map((event) => ({
    id: String(event.id),
    label:
      event.from_status === null
        ? getOrderStatusLabel(event.to_status)
        : `${getOrderStatusLabel(event.from_status)} → ${getOrderStatusLabel(event.to_status)}`,
    timestamp: formatClock(event.created_at, now),
    actor: ACTOR_WORDS[event.actor_type] ?? event.actor_type,
    detail: event.reason ?? undefined,
    tone: getOrderStatusTone(event.to_status),
  }));
}

function MoneyLine({
  label,
  amount,
  strong = false,
  isDeduction = false,
}: {
  readonly label: string;
  readonly amount: string;
  readonly strong?: boolean;
  /**
   * Taken off the total, not added to it. The wire sends the discount as a
   * positive figure, and printed that way it read as one more charge: the
   * subtotal only added up once you guessed which line was negative.
   */
  readonly isDeduction?: boolean;
}): React.JSX.Element {
  const value = isDeduction ? -Math.abs(Number(amount)) : Number(amount);
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt
        className={
          strong ? "text-[15px] font-semibold text-ink" : "text-[14px] text-ink-3"
        }
      >
        {label}
      </dt>
      <dd
        className={cn(
          "font-mono tabular-nums",
          strong ? "text-[18px] font-semibold text-ink" : "text-[14px]",
          !strong && (isDeduction ? "text-ok" : "text-ink-2"),
        )}
      >
        {isDeduction ? formatSignedMoney(value) : formatMoney(amount)}
      </dd>
    </div>
  );
}

/** A coupon was used but its code is not ours to read, or no longer listed. */
const COUPON_FALLBACK_LABEL = "Coupon discount";

/**
 * The discount line, named after the coupon when this person may read the
 * coupon list. Its own component so the coupon read only happens for an order
 * that used one, and never for a shift worker who would only be refused it.
 */
function DiscountLine({
  order,
  kitchen,
}: {
  readonly order: OrderDetail;
  readonly kitchen: ReadyKitchen;
}): React.JSX.Element {
  const couponId = order.coupon_id;
  const canReadCoupons = couponId !== null && kitchen.can("offers.view");
  return canReadCoupons ? (
    <NamedCouponLine order={order} kitchen={kitchen} couponId={couponId} />
  ) : (
    <MoneyLine
      label={couponId === null ? "Discount" : COUPON_FALLBACK_LABEL}
      amount={order.discount_amount}
      isDeduction
    />
  );
}

function NamedCouponLine({
  order,
  kitchen,
  couponId,
}: {
  readonly order: OrderDetail;
  readonly kitchen: ReadyKitchen;
  readonly couponId: number;
}): React.JSX.Element {
  const coupons = useCoupons(kitchen);
  const code = coupons.data?.find((coupon) => coupon.id === couponId)?.code;
  return (
    <MoneyLine
      label={code === undefined ? COUPON_FALLBACK_LABEL : `Discount (coupon ${code})`}
      amount={order.discount_amount}
      isDeduction
    />
  );
}

/**
 * Who it is going to, as one muted line under the trail.
 *
 * It was a whole card, and for this restaurant it nearly always said "Not this
 * restaurant's to see": the customer's name, phone and address are theirs and
 * the API answers 403 every time. A card that exists to say it is empty pushed
 * the action further down, so it is a line now — and when the API does share
 * the details, they fit on the same line.
 */
function DeliveryLine({
  order,
  kitchen,
}: {
  readonly order: OrderDetail;
  readonly kitchen: ReadyKitchen;
}): React.JSX.Element {
  const address = useAddress(kitchen, order.address_id);
  const customer = useCustomer(kitchen, order.user_id);

  const isCustomerRefused = isPermanentRefusal(customer.error);
  const isAddressRefused = isPermanentRefusal(address.error);

  if (customer.isPending || address.isPending) {
    return <Skeleton className="h-5 w-64" label="Loading who this is going to" />;
  }

  // A real failure, not the designed boundary, still gets its retry.
  const failure =
    customer.error !== null && !isCustomerRefused
      ? { error: customer.error, retry: customer.refetch }
      : address.error !== null && !isAddressRefused
        ? { error: address.error, retry: address.refetch }
        : null;
  if (failure !== null) {
    return (
      <LoadError
        error={failure.error}
        title="Could not load who this is going to"
        onRetry={() => {
          void failure.retry();
        }}
      />
    );
  }

  const parts = [
    customer.data?.name,
    customer.data?.phone,
    address.data === undefined ? undefined : formatAddress(address.data),
  ].filter((part): part is string => part !== undefined && part !== "");

  return (
    <p className="text-[14px] leading-snug text-ink-3">
      <span className="font-medium text-ink-2">Delivering to</span>{" "}
      {parts.length === 0
        ? "— the customer's name, phone and address stay with them."
        : parts.join(" · ")}
    </p>
  );
}

function formatAddress(address: Address): string {
  return [address.label, address.line1, address.line2, `${address.city} ${address.pincode}`]
    .filter((part): part is string => part !== null && part !== "")
    .join(", ");
}

function OrderBody({
  orderId,
  kitchen,
}: {
  readonly orderId: string;
  readonly kitchen: ReadyKitchen;
}): React.JSX.Element {
  const now = useNow(TICK_DETAIL_MS);

  const order = useOrder(kitchen, orderId);
  const faces = useDishFaces(kitchen);
  const clock = useOrderClock(kitchen, orderId);
  const events = useOrderEvents(kitchen, orderId);

  const wrongKitchen = order.data !== undefined && !belongsToKitchen(order.data, kitchen);
  const data = wrongKitchen ? undefined : order.data;
  // The clock is polled while this screen is open, so it carries the freshest
  // promise and status. Fall back to the order itself until it lands.
  const promise = data === undefined ? undefined : (clock.data ?? data);
  const late =
    promise === undefined
      ? null
      : readLateness(promise.status, promise.promised_at, now);
  // When it settled, from the trail first: the trail is the record of the
  // transition itself, and the clock line must never disagree with the
  // "→ Delivered" row printed under it. The order's own stamp stands in until
  // the trail loads.
  const settledEvent =
    data === undefined
      ? undefined
      : [...(events.data ?? [])].reverse().find((event) => event.to_status === data.status);
  const settledAt = settledEvent?.created_at ?? (data === undefined ? null : settledAtOf(data));

  return (
    <div className="flex flex-col gap-5">
      {order.isPending ? <CardSkeletons count={2} label="Loading this order" /> : null}

      {order.error !== null ? (
        <LoadError
          error={order.error}
          title="Could not load this order"
          onRetry={() => {
            void order.refetch();
          }}
        />
      ) : null}

      {wrongKitchen ? (
        <EmptyCard
          title="This ticket belongs to another restaurant"
          detail={`Order #${orderId} was placed at a different restaurant, and ${kitchen.restaurant.name} is the one open on this tablet. Nothing about somebody else's order is shown here — go back to the orders board for the tickets that are yours.`}
        />
      ) : null}

      {data !== undefined ? (
        // One column on a portrait tablet, in the order a cook reads a ticket.
        // From 1024px, two: what was ordered on the left (7/12), and the status,
        // the move and the trail on the right (5/12), sticky — so on a long
        // order the button stays on screen instead of falling below the fold
        // under a 1140px-wide list of lines.
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle>What they ordered</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              <OrderItems items={data.items} faces={faces} maxLines={data.items.length} />

              <dl className="flex flex-col gap-1.5 border-t border-line pt-3">
                <MoneyLine label="Subtotal" amount={data.subtotal} />
                <MoneyLine label="Packaging" amount={data.packaging_fee} />
                <MoneyLine label="Delivery" amount={data.delivery_fee} />
                <MoneyLine label="Tax" amount={data.tax_amount} />
                {Number(data.discount_amount) > 0 ? (
                  <DiscountLine order={data} kitchen={kitchen} />
                ) : null}
                <div className="mt-1 border-t border-line pt-2">
                  <MoneyLine label="Total" amount={data.total_amount} strong />
                </div>
              </dl>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-5 lg:sticky lg:top-[calc(var(--partner-header-h,96px)+16px)] lg:col-span-5">
            <TicketCard tier={late === null ? 0 : late.tier}>
              {/* The graded headline runs large in the clock directly below, so
                  the header carries the status and nothing that repeats it. No
                  order id either: the page title already says it. */}
              <CardHeader className="flex-wrap items-center gap-2 pl-5">
                <StatusChip status={data.status} />
              </CardHeader>
              <CardBody className="flex flex-col gap-4 pl-5">
                <OrderClock
                  status={data.status}
                  placedAt={data.placed_at}
                  promisedAt={data.promised_at}
                  settledAt={settledAt}
                  now={now}
                  prominent
                />

                {/*
                  What the customer asked for about the delivery itself — "leave
                  it at the gate", "ring the bell twice". Given the warn treatment
                  that per-item notes already get, because it changes what
                  somebody has to DO and is the one line on this screen a courier
                  acts on. Beside the move on purpose: it is an instruction.
                */}
                {data.delivery_note !== null && data.delivery_note !== "" ? (
                  <p className="rounded-card border border-warn/30 bg-warn-soft px-3 py-2 text-[14px] leading-snug text-warn">
                    <span className="font-semibold">Delivery note:</span>{" "}
                    {data.delivery_note}
                  </p>
                ) : null}

                {data.cancellation_reason !== null ? (
                  <p className="rounded-card border border-line bg-surface-2 px-3 py-2 text-[14px] leading-snug text-ink-2">
                    <span className="font-semibold">Cancelled:</span>{" "}
                    {data.cancellation_reason}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3">
                  <NextAction order={data} kitchen={kitchen} now={now} />
                  {canRestaurantCancel(data.status) ? (
                    <CancelOrderControl order={data} kitchen={kitchen} now={now} />
                  ) : null}
                </div>
              </CardBody>
            </TicketCard>

            <Card>
              <CardHeader>
                <CardTitle>Status trail</CardTitle>
              </CardHeader>
              <CardBody>
                {events.isPending ? (
                  <Skeleton className="h-24 w-full" label="Loading the status trail" />
                ) : null}

                {events.error !== null ? (
                  <LoadError
                    error={events.error}
                    title="Could not load the status trail"
                    onRetry={() => {
                      void events.refetch();
                    }}
                  />
                ) : null}

                {events.data !== undefined && events.data.length === 0 ? (
                  <EmptyState
                    title="No status trail for this order yet"
                    detail="Every move — placed, accepted, preparing, handed over — is written here with the time it happened and who made it."
                  />
                ) : null}

                {events.data !== undefined && events.data.length > 0 ? (
                  <Timeline entries={toTimeline(events.data, now)} />
                ) : null}
              </CardBody>
            </Card>

            <DeliveryLine order={data} kitchen={kitchen} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The page frame is outside the gate on purpose: the title and the way back to
 * the board are useful even when the tablet is signed in as the wrong person.
 */
export function OrderDetailView({
  orderId,
}: {
  readonly orderId: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          href="/orders"
          className="inline-flex min-h-11 w-fit items-center rounded-card pr-3 font-sans text-[15px] font-medium text-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          ← Back to orders
        </Link>
        <PageTitle subtitle="One ticket, its lines, where it is going and how it got here.">
          Order #{orderId}
        </PageTitle>
      </div>

      <KitchenGate loadingCards={2} loadingLabel="Loading this order" requires="orders.view">
        {(kitchen) => <OrderBody orderId={orderId} kitchen={kitchen} />}
      </KitchenGate>
    </div>
  );
}
