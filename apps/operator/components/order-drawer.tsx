"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import {
  Badge,
  getOrderStatusLabel,
  getOrderStatusTone,
  Skeleton,
  SkeletonRows,
  StatusChip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
  Thumb,
  Timeline,
  type TimelineEntry,
  type Tone,
} from "@repo/ui";
import type { DeliveryDetail, OrderDetail, OrderEventRead } from "../lib/api-types";
import {
  formatDateOnly,
  formatDateTime,
  formatDuration,
  formatMoney,
  formatOrderRef,
  formatPaymentMethod,
  humanizeEnum,
} from "../lib/format";
import {
  isRefundBreached,
  paymentStatusTone,
  refundStatusTone,
} from "../lib/sla";
import {
  useOrderDelivery,
  useOrderDetail,
  useOrderEvents,
  useOrderPayments,
  useOrderRefunds,
  useRestaurantDirectory,
  useUser,
  useUserAddresses,
} from "../lib/queries";
import { useNow } from "../lib/use-now";
import { DeliveryActionDialog } from "./delivery-actions";
import { CancelOrderDialog, isOpenOrder, OrderFooter } from "./order-actions";
import { QueryState } from "./query-state";
import { Sheet } from "./sheet";

/**
 * The ride chip, matching the Deliveries board. It was `cool` for anything not
 * yet delivered — cool means "out for delivery", so a ride still waiting at
 * the kitchen or one that had failed read as on the road (OP-7).
 */
const RIDE_TONE: Readonly<Record<DeliveryDetail["status"], Tone>> = {
  assigned: "warn",
  picked_up: "cool",
  delivered: "ok",
  failed: "crit",
};

/** Both thumbnails in the drawer. Big enough to read, small enough to inline. */
const THUMB_PX = 32;

export interface OrderDrawerProps {
  readonly orderId: number | null;
  readonly onClose: () => void;
}

function Section({
  title,
  aside,
  children,
}: {
  readonly title: string;
  readonly aside?: React.ReactNode;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="mb-5 last:mb-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="font-sans text-[11px] font-semibold uppercase tracking-wide text-ink-3">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function MoneyRow({
  label,
  value,
  emphasis = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly emphasis?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <span
        className={
          emphasis
            ? "font-sans text-[13px] font-semibold text-ink"
            : "font-sans text-[13px] text-ink-3"
        }
      >
        {label}
      </span>
      <span
        className={
          emphasis
            ? "font-sans text-[13px] font-semibold tabular-nums text-ink"
            : "font-sans text-[13px] tabular-nums text-ink-2"
        }
      >
        {value}
      </span>
    </div>
  );
}

/** A labelled fact, for the blocks that are prose rather than money. */
function DetailRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <span className="shrink-0 font-sans text-[13px] text-ink-3">{label}</span>
      <span className="min-w-0 text-right font-sans text-[13px] text-ink-2">
        {children}
      </span>
    </div>
  );
}

/**
 * Who placed the order.
 *
 * The order itself carries only `user_id`, and a support call that opens with
 * "#412 is late" is answered by knowing whose it is. GET /users/{id} admits
 * platform staff on the read and refuses them the edit, so this is a name and
 * a phone number, never a form.
 */
function CustomerSection({ userId }: { readonly userId: number }): React.JSX.Element {
  const customer = useUser(userId);

  return (
    <Section title="Customer">
      <QueryState
        query={customer}
        errorTitle="The customer could not load"
        emptyTitle="No profile for this order"
        emptyDetail="Every order is placed by a registered account, so an empty profile points at bad data."
        skeleton={<SkeletonRows rows={2} />}
      >
        {(person) => (
          <>
            <div className="flex items-center gap-3">
              <Thumb
                src={person.avatar_url}
                name={person.name}
                size={THUMB_PX}
                shape="circle"
              />
              <div className="min-w-0">
                <p className="truncate font-sans text-[13px] font-semibold text-ink">
                  {person.name}
                </p>
                <p className="truncate font-sans text-[12px] text-ink-3">
                  {person.city} · joined {formatDateOnly(person.created_at)}
                </p>
              </div>
              {person.is_active ? null : (
                <Badge tone="mute" className="ml-auto shrink-0">
                  Deactivated
                </Badge>
              )}
            </div>
            <div className="mt-2 border-t border-line pt-1">
              <DetailRow label="Email">
                <span className="break-all">{person.email}</span>
              </DetailRow>
              <DetailRow label="Phone">
                <span className="font-mono text-[12px]">{person.phone}</span>
              </DetailRow>
            </div>
          </>
        )}
      </QueryState>
    </Section>
  );
}

/**
 * Where the order went and who took it.
 *
 * Two reads, both already permitted. The address is matched out of the
 * customer's own list rather than fetched by id, because GET /addresses/{id}
 * refuses platform staff on purpose; an id that is no longer in the list means
 * the customer deleted the address after ordering, which is said out loud
 * instead of leaving the line blank. The rider's 404 is the ordinary answer
 * until pickup, so it renders as a sentence, not as an error.
 */
function DeliverySection({
  order,
}: {
  readonly order: OrderDetail;
}): React.JSX.Element {
  const { id: orderId, user_id: userId, address_id: addressId } = order;
  const addresses = useUserAddresses(userId);
  const delivery = useOrderDelivery(orderId);
  const address = addresses.data?.find((row) => row.id === addressId);

  return (
    <Section title="Delivery">
      {addresses.isPending ? (
        <SkeletonRows rows={2} />
      ) : addresses.isError ? (
        <p className="font-sans text-[13px] text-crit">
          {toUserMessage(addresses.error)}
        </p>
      ) : address === undefined ? (
        <p className="font-sans text-[13px] text-ink-3">
          Address {addressId} is no longer saved on this customer&apos;s account, so
          the street it went to cannot be read back.
        </p>
      ) : (
        <div>
          <p className="font-sans text-[13px] text-ink">
            {address.label}
            {address.is_default ? (
              <Badge tone="mute" dot={false} className="ml-2">
                Default
              </Badge>
            ) : null}
          </p>
          <p className="font-sans text-[13px] text-ink-2">
            {address.line1}
            {address.line2 === null || address.line2 === "" ? "" : `, ${address.line2}`}
          </p>
          <p className="font-sans text-[12px] text-ink-3">
            {address.city} {address.pincode}
          </p>
        </div>
      )}

      {order.delivery_note === null || order.delivery_note === "" ? null : (
        // The customer's own instruction to the rider. Given its own block
        // rather than a DetailRow because it is a sentence somebody wrote, not
        // a field — and because it is the one line on this panel that changes
        // what a rider is told to do.
        <p className="mt-2 rounded-card border border-line-2 bg-surface-2 px-3 py-2 font-sans text-[13px] text-ink-2">
          <span className="mr-1.5 font-semibold text-ink-3">Note for the rider:</span>
          {order.delivery_note}
        </p>
      )}

      <div className="mt-2 border-t border-line pt-1">
        {delivery.isPending ? (
          <SkeletonRows rows={1} />
        ) : delivery.isError ? (
          <p className="font-sans text-[13px] text-crit">
            {toUserMessage(delivery.error)}
          </p>
        ) : delivery.data === null || delivery.data === undefined ? (
          <p className="font-sans text-[13px] text-ink-3">
            No rider assigned. One is attached when the order leaves the kitchen.
          </p>
        ) : (
          <>
            <DetailRow label="Rider">
              <span className="text-ink">{delivery.data.partner.name}</span>
            </DetailRow>
            <DetailRow label="Reach them">
              <span className="font-mono text-[12px]">
                {delivery.data.partner.phone}
              </span>
            </DetailRow>
            <DetailRow label="Vehicle">
              {humanizeEnum(delivery.data.partner.vehicle_type)}
            </DetailRow>
            <DetailRow label="Ride">
              <Badge tone={RIDE_TONE[delivery.data.status]}>
                {humanizeEnum(delivery.data.status)}
              </Badge>
            </DetailRow>
            <DetailRow label="Distance">
              {delivery.data.distance_km} km · {formatDuration(delivery.data.eta_minutes)}{" "}
              estimated
            </DetailRow>
            <DetailRow label="Assigned">
              {formatDateTime(delivery.data.assigned_at)}
            </DetailRow>
            {delivery.data.picked_up_at === null ? null : (
              <DetailRow label="Picked up">
                {formatDateTime(delivery.data.picked_up_at)}
              </DetailRow>
            )}
            {delivery.data.delivered_at === null ? null : (
              <DetailRow label="Delivered">
                {formatDateTime(delivery.data.delivered_at)}
              </DetailRow>
            )}
          </>
        )}
      </div>
    </Section>
  );
}

/**
 * Who moved the order, in words.
 *
 * The trail carries `actor_type` and an id, and printing them raw put "User
 * 250" on the drawer of the very customer whose name is in the section above
 * it (OP-4). The customer is named; anyone else is named by role, because an
 * id is not something support can say back on a call.
 */
function describeActor(
  event: OrderEventRead,
  order: OrderDetail | undefined,
  customerName: string | undefined,
  kitchenName: string | undefined,
): string {
  if (event.actor_type === "user") {
    return order !== undefined && event.actor_id === order.user_id
      ? (customerName ?? "The customer")
      : "Another customer account";
  }
  if (event.actor_type === "restaurant") {
    return kitchenName === undefined ? "Kitchen staff" : `${kitchenName} staff`;
  }
  if (event.actor_type === "agent") return "Foodishi support";
  return humanizeEnum(event.actor_type);
}

function OrderBody({ orderId }: { readonly orderId: number }): React.JSX.Element {
  const detail = useOrderDetail(orderId);
  const events = useOrderEvents(orderId);
  const payments = useOrderPayments(orderId);
  const refunds = useOrderRefunds(orderId);
  // useNow, not Date.now(). Reading the clock in a component body is an impure
  // render, and it meant the refund SLA badges were computed once against
  // whatever instant the drawer happened to open at: leave it open across a
  // refund's due time and "Past SLA" never appeared until something unrelated
  // re-rendered the tree. Null until mounted, which is what keeps the first
  // client render identical to the server's.
  const nowMs = useNow();
  const order = detail.data;
  // Both already cached: the customer section and the drawer header read them.
  const customer = useUser(order?.user_id ?? null);
  const restaurants = useRestaurantDirectory();
  const kitchenName =
    order === undefined ? undefined : restaurants.data?.get(order.restaurant_id)?.name;

  return (
    <>
      {/* Both sections need the order before they can name a customer or an
          address, so they stand in for themselves rather than appearing above
          the items later and pushing everything down. */}
      {order === undefined ? (
        <>
          <Section title="Customer">
            <SkeletonRows rows={2} />
          </Section>
          <Section title="Delivery">
            <SkeletonRows rows={2} />
          </Section>
        </>
      ) : (
        <>
          <CustomerSection userId={order.user_id} />
          <DeliverySection order={order} />
        </>
      )}

      <Section title="Items">
        <QueryState
          query={detail}
          errorTitle={`Order ${formatOrderRef(orderId)} could not load`}
          emptyTitle="This order has no line items"
          emptyDetail="Every order is placed with at least one item, so this points at bad data rather than an empty basket."
          isEmpty={(data) => data.items.length === 0}
          skeleton={<SkeletonRows rows={3} />}
        >
          {(order) => (
            <>
              <TableScroll>
                <Table aria-label={`Items on order ${formatOrderRef(orderId)}`}>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Item</TableHeaderCell>
                      <TableHeaderCell numeric>Qty</TableHeaderCell>
                      <TableHeaderCell numeric>Unit</TableHeaderCell>
                      <TableHeaderCell numeric>Line</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <span className="text-ink">{item.item_name}</span>
                          {/* The choices frozen onto the line at order time. Paid
                              ones carry their delta, because Unit already includes
                              it and an operator reconciling money needs to see why.
                              `?? []` covers fixture rows written before the field. */}
                          {(item.modifiers ?? []).length > 0 ? (
                            <span className="block text-[12px] text-ink-2">
                              {(item.modifiers ?? [])
                                .map((choice) =>
                                  Number(choice.price_delta) === 0
                                    ? choice.option_name
                                    : `${choice.option_name} +${formatMoney(choice.price_delta)}`,
                                )
                                .join(" · ")}
                            </span>
                          ) : null}
                          {/* The customer's own words, labelled and set apart:
                              in the same 12px grey as the options above, "no
                              onions" read as a choice the menu offered. */}
                          {item.notes !== null && item.notes !== "" ? (
                            <span className="block text-[12px] text-ink-3 italic">
                              <span className="font-medium not-italic">Note:</span>{" "}
                              {item.notes}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell numeric>{item.quantity}</TableCell>
                        <TableCell numeric>{formatMoney(item.unit_price)}</TableCell>
                        <TableCell numeric>{formatMoney(item.line_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableScroll>

              <div className="mt-3 border-t border-line pt-2">
                <MoneyRow label="Subtotal" value={formatMoney(order.subtotal)} />
                <MoneyRow label="Packaging" value={formatMoney(order.packaging_fee)} />
                <MoneyRow
                  label={`Delivery · ${order.distance_km} km`}
                  value={formatMoney(order.delivery_fee)}
                />
                <MoneyRow label="Tax" value={formatMoney(order.tax_amount)} />
                {Number.parseFloat(order.discount_amount) > 0 ? (
                  <MoneyRow
                    label={
                      order.coupon_id === null
                        ? "Discount"
                        : `Discount · coupon #${String(order.coupon_id)}`
                    }
                    value={`−${formatMoney(order.discount_amount)}`}
                  />
                ) : null}
                <MoneyRow
                  label="Total"
                  value={formatMoney(order.total_amount)}
                  emphasis
                />
              </div>

              {order.cancelled_at !== null ? (
                <p className="mt-3 rounded-card border border-crit/25 bg-crit-soft px-3 py-2 text-[13px] text-crit">
                  Cancelled {formatDateTime(order.cancelled_at)}
                  {order.cancellation_reason !== null
                    ? ` — ${order.cancellation_reason}`
                    : ""}
                </p>
              ) : null}
            </>
          )}
        </QueryState>
      </Section>

      <Section title="Status timeline">
        <QueryState
          query={events}
          errorTitle="The status trail could not load"
          emptyTitle="No status events recorded"
          emptyDetail="Every change of state is recorded here. An empty trail means this order has not moved since it was placed."
          isEmpty={(data) => data.length === 0}
          skeleton={<SkeletonRows rows={4} />}
        >
          {(trail) => (
            <Timeline
              entries={trail.map<TimelineEntry>((event) => ({
                id: String(event.id),
                label: getOrderStatusLabel(event.to_status),
                tone: getOrderStatusTone(event.to_status),
                timestamp: formatDateTime(event.created_at),
                actor: describeActor(event, order, customer.data?.name, kitchenName),
                detail: event.reason ?? undefined,
              }))}
            />
          )}
        </QueryState>
      </Section>

      <Section title="Payments">
        <QueryState
          query={payments}
          errorTitle="Payments could not load"
          emptyTitle="No payment attempted yet"
          emptyDetail="A payment row appears once the customer authorises one. Cash-on-delivery orders get theirs at handover."
          isEmpty={(data) => data.items.length === 0}
          skeleton={<SkeletonRows rows={2} />}
        >
          {(page) => (
            <TableScroll>
              <Table aria-label={`Payments on order ${formatOrderRef(orderId)}`}>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Method</TableHeaderCell>
                    <TableHeaderCell>State</TableHeaderCell>
                    <TableHeaderCell>Provider ref</TableHeaderCell>
                    <TableHeaderCell numeric>Amount</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {page.items.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatPaymentMethod(payment.method)}</TableCell>
                      <TableCell>
                        <Badge tone={paymentStatusTone(payment.status)}>
                          {humanizeEnum(payment.status)}
                        </Badge>
                        {payment.failed_reason !== null ? (
                          <span className="block text-[12px] text-crit">
                            {payment.failed_reason}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell mono>{payment.provider_ref ?? "—"}</TableCell>
                      <TableCell numeric>{formatMoney(payment.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableScroll>
          )}
        </QueryState>
      </Section>

      <Section title="Refunds">
        <QueryState
          query={refunds}
          errorTitle="Refunds could not load"
          emptyTitle="No refund on this order"
          emptyDetail="Refunds appear here after a cancellation inside the window, a quality complaint or a late delivery."
          isEmpty={(data) => data.items.length === 0}
          skeleton={<SkeletonRows rows={2} />}
        >
          {(page) => (
            <TableScroll>
              <Table aria-label={`Refunds on order ${formatOrderRef(orderId)}`}>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Reason</TableHeaderCell>
                    <TableHeaderCell>State</TableHeaderCell>
                    <TableHeaderCell>SLA due</TableHeaderCell>
                    <TableHeaderCell numeric>Amount</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {page.items.map((refund) => {
                    // Unknown until the clock is available, and "unknown" must
                    // not render as "breached" — a badge that claims an SLA is
                    // blown for one frame on every open is worse than one that
                    // appears a tick late.
                    const breached =
                      nowMs === null ? false : isRefundBreached(refund, nowMs);
                    return (
                      <TableRow
                        key={refund.id}
                        stripe={breached ? "crit" : undefined}
                      >
                        <TableCell>{humanizeEnum(refund.reason)}</TableCell>
                        <TableCell>
                          <Badge tone={refundStatusTone(refund.status)}>
                            {humanizeEnum(refund.status)}
                          </Badge>
                        </TableCell>
                        <TableCell mono>
                          {formatDateTime(refund.sla_due_at)}
                          {breached ? (
                            <Badge tone="crit" className="ml-2">
                              Past SLA
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell numeric>{formatMoney(refund.amount)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableScroll>
          )}
        </QueryState>
      </Section>
    </>
  );
}

/**
 * The order drawer: who ordered, where it went, what was in it, how it moved,
 * what was paid and what came back.
 *
 * The kitchen is resolved here rather than passed in. Every caller used to
 * carry a name down as a prop and the SLA watch, which has no directory of its
 * own, showed "Restaurant 12" instead; one shared query with an infinite stale
 * time is both cheaper and the same answer everywhere.
 */
export function OrderDrawer({
  orderId,
  onClose,
}: OrderDrawerProps): React.JSX.Element {
  const detail = useOrderDetail(orderId);
  const restaurants = useRestaurantDirectory();
  const order = detail.data;
  const kitchen =
    order === undefined ? undefined : restaurants.data?.get(order.restaurant_id);
  const kitchenName = kitchen?.name ?? (order === undefined ? "" : `Restaurant ${String(order.restaurant_id)}`);

  const [reassigning, setReassigning] = React.useState<DeliveryDetail | null>(null);
  const [cancelling, setCancelling] = React.useState<number | null>(null);

  // A different order, or none, closes whatever confirmation was open: it was
  // about the previous order and must never be answered on behalf of this one.
  React.useEffect(() => {
    setReassigning(null);
    setCancelling(null);
  }, [orderId]);

  const showFooter = order !== undefined && order.id === orderId && isOpenOrder(order.status);

  return (
    <>
      <Sheet
        open={orderId !== null}
        onClose={onClose}
        title={
          <span className="flex items-center gap-2">
            <span className="font-mono">
              {orderId === null ? "" : formatOrderRef(orderId)}
            </span>
            {order !== undefined ? <StatusChip status={order.status} /> : null}
          </span>
        }
        subtitle={
          order === undefined ? (
            <Skeleton className="h-3 w-52" label="Loading order summary" />
          ) : (
            <span className="flex items-center gap-2">
              <Thumb src={kitchen?.image_url} name={kitchenName} size={THUMB_PX} />
              {/* Each fragment holds together and the line breaks only
                  between them: "21 Aug, ⏎ 20:26" split a timestamp in half
                  (OP-4). */}
              <span className="flex min-w-0 flex-wrap gap-x-1">
                <span className="whitespace-nowrap">{kitchenName} ·</span>
                <span className="whitespace-nowrap">
                  placed {formatDateTime(order.placed_at)} ·
                </span>
                <span className="whitespace-nowrap">
                  promised {formatDateTime(order.promised_at)}
                </span>
              </span>
            </span>
          )
        }
        footer={
          showFooter ? (
            <OrderFooter
              order={order}
              onReassign={setReassigning}
              onCancel={setCancelling}
            />
          ) : undefined
        }
      >
        {orderId === null ? null : <OrderBody orderId={orderId} />}
      </Sheet>

      {/* Siblings of the sheet, not children of it. React bubbles a portal's
          events through the component tree, so a dialog inside the sheet
          would hand its Escape to the sheet's own handler and close both. */}
      <DeliveryActionDialog
        row={
          order === undefined || reassigning === null
            ? null
            : { delivery: reassigning, order }
        }
        action="reassign"
        onClose={() => setReassigning(null)}
      />
      <CancelOrderDialog
        order={cancelling === null || order === undefined ? null : order}
        refund={cancelling ?? 0}
        onClose={() => setCancelling(null)}
      />
    </>
  );
}
