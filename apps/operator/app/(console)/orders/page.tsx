"use client";

import * as React from "react";
import {
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  FilterChip,
  getOrderStatusLabel,
  Input,
  ORDER_STATUSES,
  Pagination,
  PageTitle,
  SegmentedControl,
  Select,
  SEVERITY_LABEL,
  SEVERITY_TEXT,
  SeverityCell,
  Stat,
  StatRail,
  StatusChip,
  TableFooter,
  Thumb,
  Toolbar,
  type OrderStatus,
} from "@repo/ui";
import { BoardSkeleton, RailSkeleton } from "../../../components/board-skeleton";
import { OrderDrawer } from "../../../components/order-drawer";
import { QueryState } from "../../../components/query-state";
import {
  formatCount,
  formatDateTime,
  formatMoney,
  formatMoneyWhole,
  formatOrderRef,
  toNumber,
} from "../../../lib/format";
import { DECK_PAGE, DECK_PANEL, DECK_RAIL } from "../../../lib/deck";
import { getPromiseOutcome } from "../../../lib/sla";
import {
  ORDER_PAGE_SIZE,
  useOrdersBoard,
  useCustomerDirectory,
  useRestaurantDirectory,
} from "../../../lib/queries";
import { useNow } from "../../../lib/use-now";
import type { OrderSort } from "../../../lib/services/types";

/** Covers and avatars in a 38px row. */
const THUMB_PX = 22;

const ANY = "any";

type Range = "1" | "7" | "30" | "0";

const RANGE_OPTIONS = [
  { value: "1" as const, label: "24 hours" },
  { value: "7" as const, label: "7 days" },
  { value: "30" as const, label: "30 days" },
  { value: "0" as const, label: "All time" },
];

const RANGE_WORDS: Record<Range, string> = {
  "1": "the last 24 hours",
  "7": "the last 7 days",
  "30": "the last 30 days",
  "0": "all time",
};

/** The three axes this board offers. `OrderSort` has a fourth nobody asked for. */
type BoardSort = Extract<OrderSort, "newest" | "largest" | "latest_promise">;

const SORT_OPTIONS: readonly { value: BoardSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "largest", label: "Largest" },
  { value: "latest_promise", label: "Oldest promise" },
];

/** Plain words for the footer — never a column name (DENSITY.md §5, §6). */
const SORTED_BY: Record<OrderSort, string> = {
  newest: "when it was placed, newest first",
  oldest: "when it was placed, oldest first",
  largest: "what the customer paid, largest first",
  latest_promise: "the promise it was given, oldest first",
};

/**
 * Every order on the platform, and the one screen an operator arrives at with a
 * specific one in mind.
 *
 * So the search is the first control and it matches four things — the order's
 * id, the customer's name, their email and the kitchen's name — because a
 * support call opens with whichever of those the person on the phone happens to
 * have. Everything else on the toolbar narrows; the search finds.
 *
 * The window defaults to seven days rather than all time. "Every order ever
 * placed, newest first" is a data dump; the question this screen is opened with
 * is almost always about this week.
 */
export default function OrdersPage(): React.JSX.Element {
  const nowMs = useNow();
  const [term, setTerm] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<string>(ANY);
  const [kitchen, setKitchen] = React.useState<string>(ANY);
  const [range, setRange] = React.useState<Range>("7");
  const [sort, setSort] = React.useState<BoardSort>("newest");
  const [offset, setOffset] = React.useState(0);
  const [openOrderId, setOpenOrderId] = React.useState<number | null>(null);

  const restaurants = useRestaurantDirectory();
  const customers = useCustomerDirectory();

  const orders = useOrdersBoard({
    q: query,
    status: status === ANY ? null : (status as OrderStatus),
    restaurantId: kitchen === ANY ? null : Number.parseInt(kitchen, 10),
    liveOnly: false,
    withinDays: Number.parseInt(range, 10),
    sort,
    limit: ORDER_PAGE_SIZE,
    offset,
  });

  /** Any change to what is matched starts again at the first page. */
  const narrow = React.useCallback((apply: () => void) => {
    apply();
    setOffset(0);
  }, []);

  const submitSearch = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      narrow(() => setQuery(term.trim()));
    },
    [narrow, term],
  );

  const statusOptions = React.useMemo(
    () => [
      { value: ANY, label: "Any state" },
      ...ORDER_STATUSES.map((value) => ({ value, label: getOrderStatusLabel(value) })),
    ],
    [],
  );

  const kitchenOptions = React.useMemo(
    () => [
      { value: ANY, label: "Every kitchen" },
      ...[...(restaurants.data?.values() ?? [])]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((row) => ({ value: String(row.id), label: row.name })),
    ],
    [restaurants.data],
  );

  const kitchenName =
    kitchen === ANY
      ? null
      : (restaurants.data?.get(Number.parseInt(kitchen, 10))?.name ?? `#${kitchen}`);

  return (
    <div className={DECK_PAGE}>
      <PageTitle subtitle="Every order on the platform. Search by order, customer or kitchen.">
        Orders
      </PageTitle>

      <QueryState
        query={orders}
        errorTitle="The orders board could not load"
        emptyTitle={
          query === ""
            ? `No orders in ${RANGE_WORDS[range]}`
            : `Nothing matches “${query}”`
        }
        emptyDetail={
          query === ""
            ? "Widen the window or clear the filters to see more."
            : "The search matches an order id, a customer's name or email, and a kitchen's name."
        }
        isEmpty={(page) => page.items.length === 0}
        skeleton={
          <>
            <RailSkeleton label="Counting the matching orders" />
            <BoardSkeleton
              rows={12}
              label="Loading orders"
              note="Reading every matching order…"
            />
          </>
        }
      >
        {(page) => {
          const rows = page.items.map((order) => ({
            order,
            outcome: nowMs === null ? null : getPromiseOutcome(order, nowMs),
            kitchen: restaurants.data?.get(order.restaurant_id),
            customer: customers.data?.get(order.user_id),
          }));

          const live = page.items.filter(
            (order) => order.status !== "delivered" && order.status !== "cancelled",
          ).length;
          const delivered = page.items.filter(
            (order) => order.status === "delivered",
          ).length;
          const cancelled = page.items.filter(
            (order) => order.status === "cancelled",
          ).length;
          const value = page.items.reduce(
            (sum, order) => sum + toNumber(order.total_amount),
            0,
          );
          const lateOnPage = rows.filter((row) => row.outcome?.isLate === true).length;

          return (
            <>
              <div className={DECK_RAIL}>
                <StatRail ariaLabel="What the filters matched">
                  <Stat
                    label="Matching"
                    value={formatCount(page.total)}
                    caption={`Placed in ${RANGE_WORDS[range]}`}
                    hint="Every order the filters above match, counted at the source rather than on this page."
                  />
                  <Stat
                    label="On this page"
                    value={formatCount(page.items.length)}
                    caption={`${formatCount(live)} still in flight`}
                    hint="The rows below. The four figures beside this one describe this page, not the whole match — page through to see the rest."
                  />
                  <Stat
                    label="Delivered"
                    value={formatCount(delivered)}
                    tone="ok"
                    caption={
                      lateOnPage > 0
                        ? `${formatCount(lateOnPage)} past their promise`
                        : "All inside their promise"
                    }
                    hint="Orders on this page that reached the customer. The caption counts the ones that arrived after the time they were promised."
                  />
                  <Stat
                    label="Cancelled"
                    value={formatCount(cancelled)}
                    tone={cancelled > 0 ? "warn" : "default"}
                    caption="On this page"
                    hint="Cancelled orders earn nothing and often cost a refund on top."
                  />
                  <Stat
                    label="Page value"
                    value={formatMoneyWhole(value)}
                    caption="What these customers paid"
                    hint="The total of every order on this page, in any state — not revenue, which only counts delivered orders."
                  />
                </StatRail>
              </div>

              <Toolbar ariaLabel="Order filters">
                <form onSubmit={submitSearch} className="flex items-center gap-2">
                  <Input
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    placeholder="Order, customer or kitchen"
                    aria-label="Search orders by order id, customer name or email, or kitchen name"
                    className="h-8 w-[230px] text-[13px]"
                  />
                  <Button type="submit" variant="outline" size="sm">
                    Search
                  </Button>
                </form>
                <SegmentedControl
                  ariaLabel="How far back to look"
                  options={RANGE_OPTIONS}
                  value={range}
                  onValueChange={(next) => narrow(() => setRange(next))}
                />
                <Select
                  aria-label="Show only one state"
                  options={statusOptions}
                  value={status}
                  onChange={(event) =>
                    narrow(() => setStatus(event.target.value))
                  }
                  className="h-8 w-[150px] text-[13px]"
                />
                <Select
                  aria-label="Show only one kitchen"
                  options={kitchenOptions}
                  value={kitchen}
                  onChange={(event) =>
                    narrow(() => setKitchen(event.target.value))
                  }
                  className="h-8 w-[170px] text-[13px]"
                />
                <SegmentedControl
                  ariaLabel="Sort the board by"
                  options={SORT_OPTIONS}
                  value={sort}
                  onValueChange={(next) => narrow(() => setSort(next))}
                />
                {query === "" ? null : (
                  <FilterChip
                    label="Matching"
                    value={query}
                    onDismiss={() =>
                      narrow(() => {
                        setTerm("");
                        setQuery("");
                      })
                    }
                  />
                )}
                {status === ANY ? null : (
                  <FilterChip
                    label="State"
                    value={getOrderStatusLabel(status as OrderStatus)}
                    onDismiss={() => narrow(() => setStatus(ANY))}
                  />
                )}
                {kitchenName === null ? null : (
                  <FilterChip
                    label="Kitchen"
                    value={kitchenName}
                    onDismiss={() => narrow(() => setKitchen(ANY))}
                  />
                )}
              </Toolbar>

              <DataTableScroll
                className={DECK_PANEL}
                footer={
                  <>
                    <TableFooter
                      shown={page.items.length}
                      total={page.total}
                      noun="orders"
                      sortedBy={SORTED_BY[sort]}
                      extra={`placed in ${RANGE_WORDS[range]}`}
                    />
                    <Pagination
                      total={page.total}
                      limit={page.limit}
                      offset={page.offset}
                      onOffsetChange={setOffset}
                      noun="orders"
                      className="border-t border-line"
                    />
                  </>
                }
              >
                <DataTable aria-label="Orders matching the filters">
                  <DataTableHead>
                    <tr>
                      <DataTableHeaderCell className="pl-4">Order</DataTableHeaderCell>
                      <DataTableHeaderCell>Placed</DataTableHeaderCell>
                      <DataTableHeaderCell>Kitchen</DataTableHeaderCell>
                      <DataTableHeaderCell>Customer</DataTableHeaderCell>
                      <DataTableHeaderCell>State</DataTableHeaderCell>
                      <DataTableHeaderCell>Against its promise</DataTableHeaderCell>
                      <DataTableHeaderCell numeric>Total</DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {rows.map(({ order, outcome, kitchen: place, customer }) => {
                      const tier = outcome?.tier ?? 0;
                      const placeName =
                        place?.name ?? `Restaurant ${String(order.restaurant_id)}`;

                      return (
                        <DataTableRow
                          key={order.id}
                          selected={order.id === openOrderId}
                          onClick={() => setOpenOrderId(order.id)}
                          className="cursor-pointer"
                        >
                          <SeverityCell tier={tier} title={SEVERITY_LABEL[tier]}>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenOrderId(order.id);
                              }}
                              aria-label={`Open order ${formatOrderRef(order.id)}`}
                              className="rounded-card font-mono text-[12px] font-medium text-accent underline underline-offset-2 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                              {formatOrderRef(order.id)}
                            </button>
                          </SeverityCell>
                          <DataTableCell mono>
                            {formatDateTime(order.placed_at)}
                          </DataTableCell>
                          <DataTableCell className="max-w-[180px] text-ink">
                            <span className="flex items-center gap-2">
                              <Thumb
                                src={place?.image_url}
                                name={placeName}
                                size={THUMB_PX}
                              />
                              <span className="truncate">{placeName}</span>
                            </span>
                          </DataTableCell>
                          <DataTableCell className="max-w-[170px] text-ink-2">
                            <span className="flex items-center gap-2">
                              <Thumb
                                src={customer?.avatar_url}
                                name={customer?.name ?? "Unknown"}
                                size={THUMB_PX}
                                shape="circle"
                              />
                              <span className="truncate">{customer?.name ?? "—"}</span>
                            </span>
                          </DataTableCell>
                          <DataTableCell>
                            <StatusChip status={order.status} />
                          </DataTableCell>
                          <DataTableCell>
                            {outcome === null ? (
                              <span className="text-ink-4">—</span>
                            ) : (
                              <span
                                className={
                                  tier === 0 ? "text-ink-3" : SEVERITY_TEXT[tier]
                                }
                              >
                                {outcome.label}
                              </span>
                            )}
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
            </>
          );
        }}
      </QueryState>

      <OrderDrawer orderId={openOrderId} onClose={() => setOpenOrderId(null)} />
    </div>
  );
}
