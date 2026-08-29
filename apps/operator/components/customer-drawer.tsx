"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import {
  Badge,
  Button,
  ErrorBanner,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  Skeleton,
  SkeletonRows,
  StatusChip,
  Thumb,
} from "@repo/ui";
import {
  formatCount,
  formatDateOnly,
  formatDateTime,
  formatMoney,
  formatMoneyWhole,
  formatOrderRef,
  toNumber,
} from "../lib/format";
import {
  useCustomerOrders,
  useRestaurantDirectory,
  useSetCustomerActive,
  useUser,
  useUserAddresses,
} from "../lib/queries";
import { QueryState } from "./query-state";
import { Sheet } from "./sheet";

/** A person, so the avatar is a circle. */
const AVATAR_PX = 36;

/** The kitchen cover beside each order row. Smaller: it is a row, not a header. */
const COVER_PX = 22;

export interface CustomerDrawerProps {
  readonly userId: number | null;
  readonly onClose: () => void;
  /**
   * Opening an order closes this drawer and opens the order's own. Stacking two
   * modals would put two focus traps on one page; the order drawer names the
   * customer anyway, so nothing is lost by swapping rather than layering.
   */
  readonly onOpenOrder: (orderId: number) => void;
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

function Figure({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
}): React.JSX.Element {
  return (
    <div title={hint} className="min-w-0">
      <dt className="text-[10px] leading-none font-bold tracking-[0.09em] uppercase text-ink-3">
        {label}
      </dt>
      <dd className="m-0 mt-1 truncate font-sans text-[15px] leading-none font-semibold tabular-nums text-ink">
        {value}
      </dd>
    </div>
  );
}

/**
 * What this one customer is worth, summed in the browser.
 *
 * There is no per-customer aggregate endpoint, so the only honest way to state
 * an order count or a lifetime spend is to read the customer's orders and add
 * them up — which is affordable for the one customer whose drawer is open and
 * is exactly why the directory table behind it has no such columns. A page
 * caps at 100 orders, so when someone has more the block says which slice it
 * counted rather than presenting a partial sum as a lifetime.
 */
function OrderingSection({
  userId,
  onOpenOrder,
}: {
  readonly userId: number;
  readonly onOpenOrder: (orderId: number) => void;
}): React.JSX.Element {
  const orders = useCustomerOrders(userId);
  const restaurants = useRestaurantDirectory();

  return (
    <QueryState
      query={orders}
      errorTitle="This customer's orders could not load"
      emptyTitle="This customer has never ordered"
      emptyDetail="A registered account with no orders is ordinary — they signed up and have not bought anything yet."
      isEmpty={(page) => page.items.length === 0}
      skeleton={<SkeletonRows rows={5} />}
    >
      {(page) => {
        const counted = page.items;
        const isPartial = page.total > counted.length;
        const delivered = counted.filter((row) => row.status === "delivered");
        const cancelled = counted.filter((row) => row.status === "cancelled");
        const spend = delivered.reduce(
          (sum, row) => sum + toNumber(row.total_amount),
          0,
        );
        // The listing is newest first, so the head of the page is the last
        // order this customer placed.
        const latest = counted[0];

        return (
          <>
            <Section
              title="Ordering"
              aside={
                <span className="font-sans text-[11px] text-ink-3">
                  {isPartial
                    ? `summed from the ${formatCount(counted.length)} most recent of ${formatCount(page.total)}`
                    : `summed from all ${formatCount(page.total)}`}
                </span>
              }
            >
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                <Figure
                  label="Orders"
                  value={formatCount(page.total)}
                  hint="Every order this customer has placed, in any state. This one figure is the server's own total rather than a sum of the rows below."
                />
                <Figure
                  label="Delivered"
                  value={formatCount(delivered.length)}
                  hint="Orders that reached the customer. Only these are counted in the spend."
                />
                <Figure
                  label="Cancelled"
                  value={formatCount(cancelled.length)}
                  hint="Orders cancelled by the customer or by the kitchen."
                />
                <Figure
                  label="Spend"
                  value={formatMoneyWhole(spend)}
                  hint="What this customer has actually paid: the total of their delivered orders, before Foodishi's commission is taken out."
                />
              </dl>
              {latest === undefined ? null : (
                <p className="mt-3 font-sans text-[12px] text-ink-3">
                  Last ordered {formatDateTime(latest.placed_at)}.
                </p>
              )}
            </Section>

            <Section title="Orders">
              <DataTableScroll>
                <DataTable aria-label="This customer's orders, newest first">
                  <DataTableHead>
                    <tr>
                      <DataTableHeaderCell className="pl-3">
                        Order
                      </DataTableHeaderCell>
                      <DataTableHeaderCell>Kitchen</DataTableHeaderCell>
                      <DataTableHeaderCell>State</DataTableHeaderCell>
                      <DataTableHeaderCell numeric>Total</DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {counted.map((order) => {
                      const kitchen = restaurants.data?.get(
                        order.restaurant_id,
                      );
                      const kitchenName =
                        kitchen?.name ??
                        `Restaurant ${String(order.restaurant_id)}`;

                      return (
                        <DataTableRow key={order.id}>
                          <DataTableCell className="pl-3">
                            <button
                              type="button"
                              onClick={() => onOpenOrder(order.id)}
                              aria-label={`Open order ${formatOrderRef(order.id)}`}
                              className="rounded-card font-mono text-[12px] font-medium text-accent underline underline-offset-2 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                              {formatOrderRef(order.id)}
                            </button>
                          </DataTableCell>
                          <DataTableCell className="max-w-[170px] text-ink">
                            <span className="flex items-center gap-2">
                              <Thumb
                                src={kitchen?.image_url}
                                name={kitchenName}
                                size={COVER_PX}
                              />
                              <span className="truncate">{kitchenName}</span>
                            </span>
                          </DataTableCell>
                          <DataTableCell>
                            <StatusChip status={order.status} />
                          </DataTableCell>
                          <DataTableCell numeric>
                            {formatMoney(order.total_amount)}
                          </DataTableCell>
                        </DataTableRow>
                      );
                    })}
                  </DataTableBody>
                </DataTable>
              </DataTableScroll>
              {isPartial ? (
                <p className="mt-2 font-sans text-[12px] text-ink-3">
                  Only the {formatCount(counted.length)} most recent are listed
                  — the directory reads one page at a time.
                </p>
              ) : null}
            </Section>
          </>
        );
      }}
    </QueryState>
  );
}

/**
 * The one control the console has over an account, with the consequence stated
 * before the tap (DESIGN.md copy rules).
 *
 * Deactivating is not deleting and the copy says so: the person keeps every
 * order they have placed, and every rupee of it stays in the reports. What they
 * lose is the ability to sign in and order again — which is the whole point, and
 * is also why it is worth being precise about.
 */
function AccountSection({
  userId,
  isActive,
  name,
}: {
  readonly userId: number;
  readonly isActive: boolean;
  readonly name: string;
}): React.JSX.Element {
  const setActive = useSetCustomerActive();

  return (
    <Section title="Account">
      {setActive.error === null ? null : (
        <div className="mb-2">
          <ErrorBanner
            title="That account could not be switched"
            message={toUserMessage(setActive.error)}
          />
        </div>
      )}
      <p className="mb-2 font-sans text-[13px] text-ink-3">
        {isActive
          ? `${name} can sign in and order. Deactivating stops both immediately — every order they have already placed is kept, and so is everything they have spent.`
          : `${name} cannot sign in or place an order. Their history is untouched and still counted in every report.`}
      </p>
      <Button
        variant={isActive ? "danger" : "primary"}
        size="sm"
        isPending={setActive.isPending}
        pendingLabel={isActive ? "Deactivating…" : "Reactivating…"}
        onClick={() => setActive.mutate({ userId, isActive: !isActive })}
      >
        {isActive ? "Deactivate this account" : "Let them order again"}
      </Button>
    </Section>
  );
}

function AddressesSection({
  userId,
}: {
  readonly userId: number;
}): React.JSX.Element {
  const addresses = useUserAddresses(userId);

  return (
    <Section title="Addresses">
      <QueryState
        query={addresses}
        errorTitle="This customer's addresses could not load"
        emptyTitle="No saved address"
        emptyDetail="A customer saves an address at their first checkout, so an empty list means they have not ordered yet."
        isEmpty={(rows) => rows.length === 0}
        skeleton={<SkeletonRows rows={2} />}
      >
        {(rows) => (
          <ul className="flex flex-col gap-2">
            {rows.map((address) => (
              <li
                key={address.id}
                className="border-b border-line pb-2 last:border-b-0"
              >
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
                  {address.line2 === null || address.line2 === ""
                    ? ""
                    : `, ${address.line2}`}
                </p>
                <p className="font-sans text-[12px] text-ink-3">
                  {address.city} {address.pincode}
                </p>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </Section>
  );
}

/**
 * One customer, as completely as the API allows: the profile, what they have
 * spent, where they have it sent, and every order they have placed.
 *
 * Read-only throughout. PATCH /users/{id} and DELETE /users/{id} hang off the
 * same guard as the read but are refused to platform staff, so there is nothing
 * here to edit even if the console wanted to.
 */
export function CustomerDrawer({
  userId,
  onClose,
  onOpenOrder,
}: CustomerDrawerProps): React.JSX.Element {
  const customer = useUser(userId);
  const person = customer.data;

  return (
    <Sheet
      open={userId !== null}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {person === undefined ? (
            <Skeleton className="h-4 w-40" label="Loading the customer" />
          ) : (
            <>
              <Thumb
                src={person.avatar_url}
                name={person.name}
                size={AVATAR_PX}
                shape="circle"
              />
              <span className="truncate">{person.name}</span>
              {person.is_active ? null : <Badge tone="warn">Deactivated</Badge>}
            </>
          )}
        </span>
      }
      subtitle={
        person === undefined ? (
          <Skeleton
            className="h-3 w-52"
            label="Loading the customer's details"
          />
        ) : (
          <>
            {person.email} · {person.phone} · {person.city} · joined{" "}
            {formatDateOnly(person.created_at)}
          </>
        )
      }
    >
      {userId === null ? null : (
        <>
          <OrderingSection userId={userId} onOpenOrder={onOpenOrder} />
          <AddressesSection userId={userId} />
          {person === undefined ? null : (
            <AccountSection
              userId={userId}
              isActive={person.is_active}
              name={person.name}
            />
          )}
        </>
      )}
    </Sheet>
  );
}
