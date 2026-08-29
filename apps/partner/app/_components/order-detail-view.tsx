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
  getOrderStatusLabel,
  getOrderStatusTone,
  type TimelineEntry,
} from "@repo/ui";
import { CancelOrderControl } from "./cancel-order-control";
import { KitchenGate } from "./kitchen-gate";
import { NextAction } from "./next-action";
import { OrderClock } from "./order-clock";
import { OrderItems } from "./order-items";
import { CardSkeletons, EmptyCard, LoadError, RefusedNote } from "./states";
import { TicketCard } from "./ticket-card";
import { formatClock, formatMoney } from "../_lib/format";
import { readLateness } from "../_lib/lateness";
import { isPermanentRefusal } from "../_lib/refusal";
import { TICK_DETAIL_MS, useNow } from "../_lib/use-now";
import { canRestaurantCancel } from "../../lib/order-flow";
import { useDishFaces } from "../../lib/queries/menu";
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

function toTimeline(events: readonly OrderEvent[]): readonly TimelineEntry[] {
  return events.map((event) => ({
    id: String(event.id),
    label:
      event.from_status === null
        ? getOrderStatusLabel(event.to_status)
        : `${getOrderStatusLabel(event.from_status)} → ${getOrderStatusLabel(event.to_status)}`,
    timestamp: formatClock(event.created_at),
    actor: ACTOR_WORDS[event.actor_type] ?? event.actor_type,
    detail: event.reason ?? undefined,
    tone: getOrderStatusTone(event.to_status),
  }));
}

function MoneyLine({
  label,
  amount,
  strong = false,
}: {
  readonly label: string;
  readonly amount: string;
  readonly strong?: boolean;
}): React.JSX.Element {
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
        className={
          strong
            ? "font-mono text-[18px] font-semibold tabular-nums text-ink"
            : "font-mono text-[14px] tabular-nums text-ink-2"
        }
      >
        {formatMoney(amount)}
      </dd>
    </div>
  );
}

function AddressBlock({ address }: { readonly address: Address }): React.JSX.Element {
  return (
    <address className="text-[15px] leading-relaxed text-ink not-italic">
      <span className="font-semibold">{address.label}</span>
      <br />
      {address.line1}
      {address.line2 !== null && address.line2 !== "" ? (
        <>
          <br />
          {address.line2}
        </>
      ) : null}
      <br />
      {address.city} <span className="font-mono tabular-nums">{address.pincode}</span>
    </address>
  );
}

function DeliveryCard({
  order,
  kitchen,
}: {
  readonly order: OrderDetail;
  readonly kitchen: ReadyKitchen;
}): React.JSX.Element {
  const address = useAddress(kitchen, order.address_id);
  const customer = useCustomer(kitchen, order.user_id);

  // The customer's name, phone and address are the customer's, and the API says
  // so with a 403 every time. Two red banners and two dead "Try again" buttons
  // made a designed boundary look like a broken screen, so when both doors are
  // shut the whole card becomes one quiet sentence.
  const bothRefused =
    isPermanentRefusal(customer.error) && isPermanentRefusal(address.error);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivering to</CardTitle>
        {customer.data !== undefined ? (
          <span className="font-mono text-[13px] tabular-nums text-ink-3">
            {customer.data.phone}
          </span>
        ) : null}
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        {bothRefused ? (
          <RefusedNote
            title="Not this restaurant's to see"
            detail="The customer's name, phone and address stay with them."
          />
        ) : (
          <>
            {customer.isPending ? (
              <Skeleton className="h-5 w-44" label="Loading the customer" />
            ) : null}

            {customer.error !== null ? (
              <LoadError
                error={customer.error}
                title="Could not load who this is going to"
                refusedTitle="The customer's name and phone stay with them"
                onRetry={() => {
                  void customer.refetch();
                }}
              />
            ) : null}

            {customer.data !== undefined ? (
              <p className="text-[15px] text-ink-2">{customer.data.name}</p>
            ) : null}

            {address.isPending ? (
              <Skeleton className="h-16 w-full" label="Loading the delivery address" />
            ) : null}

            {address.error !== null ? (
              <LoadError
                error={address.error}
                title="Could not load the delivery address"
                refusedTitle="The delivery address stays with the customer"
                onRetry={() => {
                  void address.refetch();
                }}
              />
            ) : null}

            {address.data !== undefined ? <AddressBlock address={address.data} /> : null}
          </>
        )}
      </CardBody>
    </Card>
  );
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
        <>
          <TicketCard tier={late === null ? 0 : late.tier}>
            {/* The graded headline runs large in the clock directly below, so
                the header carries the status and nothing that repeats it. */}
            <CardHeader className="flex-wrap items-center gap-2 pl-5">
              <StatusChip status={data.status} />
              <span className="font-mono text-[13px] tabular-nums text-ink-3">
                #{data.id}
              </span>
            </CardHeader>
            <CardBody className="flex flex-col gap-4 pl-5">
              <OrderClock
                status={data.status}
                placedAt={data.placed_at}
                promisedAt={data.promised_at}
                now={now}
                prominent
              />

              <OrderItems items={data.items} faces={faces} maxLines={data.items.length} />

              <dl className="flex flex-col gap-1.5 border-t border-line pt-3">
                <MoneyLine label="Subtotal" amount={data.subtotal} />
                <MoneyLine label="Packaging" amount={data.packaging_fee} />
                <MoneyLine label="Delivery" amount={data.delivery_fee} />
                <MoneyLine label="Tax" amount={data.tax_amount} />
                {Number(data.discount_amount) > 0 ? (
                  <MoneyLine label="Discount" amount={data.discount_amount} />
                ) : null}
                <div className="mt-1 border-t border-line pt-2">
                  <MoneyLine label="Total" amount={data.total_amount} strong />
                </div>
              </dl>

              {/*
                What the customer asked for about the delivery itself — "leave
                it at the gate", "ring the bell twice". Given the warn treatment
                that per-item notes already get, because it changes what somebody
                has to DO and is the one line on this screen a courier acts on.
                Above the money on purpose: it is an instruction, not a figure.
              */}
              {data.delivery_note !== null && data.delivery_note !== "" ? (
                <p className="rounded-card border border-warn/30 bg-warn-soft px-3 py-2 text-[14px] leading-snug text-warn">
                  <span className="font-semibold">Delivery note:</span>{" "}
                  {data.delivery_note}
                </p>
              ) : null}

              {data.cancellation_reason !== null ? (
                <p className="rounded-card border border-line bg-surface-2 px-3 py-2 text-[13px] leading-snug text-ink-2">
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

          <DeliveryCard order={data} kitchen={kitchen} />

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
                <Timeline entries={toTimeline(events.data)} />
              ) : null}
            </CardBody>
          </Card>
        </>
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
