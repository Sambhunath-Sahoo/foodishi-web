"use client";

import * as React from "react";
import Link from "next/link";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  Field,
  Input,
  ORDER_STATUSES,
  Pagination,
  SegmentedControl,
  Select,
  Stat,
  StatRail,
  StatusChip,
  TableFooter,
  Toolbar,
} from "@repo/ui";
import { CardSkeletons, EmptyCard, LoadError } from "../_components/states";
import {
  formatCount,
  formatDateTime,
  formatMoney,
  formatMoneyRound,
  sumMoney,
} from "../_lib/format";
import { RANGE_OPTIONS, describeRange, windowFor, type RangeKey } from "../_lib/windows";
import { useDebouncedValue } from "../_lib/use-debounced";
import { useOrderHistory } from "../../lib/queries/orders";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { OrderStatus } from "../../lib/types";

const PAGE_SIZE = 25;

/** "Any status" plus the seven the machine actually has. */
const STATUS_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: "", label: "Any status" },
  ...ORDER_STATUSES.map((status) => ({
    value: status,
    label: status.replace(/_/g, " "),
  })),
];

/** Local midnight of a calendar day, as the ISO instant a filter takes. */
function startOfDayIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

/** Midnight after a calendar day — the exclusive end. */
function endOfDayIso(date: string): string {
  const at = new Date(`${date}T00:00:00`);
  at.setDate(at.getDate() + 1);
  return at.toISOString();
}

/**
 * Every order this restaurant has taken in the window, however it ended.
 *
 * A board, not cards: nothing here needs a decision, so the job is to find one
 * ticket among a hundred and read what happened to it. The rail above sums the
 * page's window rather than the page — a manager checking last week's takings is
 * asking about the week, not about the twenty-five rows currently on screen, and
 * the footer says which of the two each number is.
 */
export function HistoryBoard({
  kitchen,
}: {
  readonly kitchen: ReadyKitchen;
}): React.JSX.Element {
  const now = React.useMemo(() => Date.now(), []);
  const [range, setRange] = React.useState<RangeKey>("7d");
  const [status, setStatus] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [offset, setOffset] = React.useState(0);

  // Typed straight into a query key, so every keystroke would be a request.
  const query = useDebouncedValue(search, 300);

  const window = React.useMemo(() => windowFor(range, now), [range, now]);

  const filter = React.useMemo(
    () => ({
      status: status === "" ? undefined : (status as OrderStatus),
      placedFrom: startOfDayIso(window.from),
      placedTo: endOfDayIso(window.to),
      q: query.trim() === "" ? undefined : query.trim(),
      limit: PAGE_SIZE,
      offset,
    }),
    [status, window, query, offset],
  );

  const history = useOrderHistory(kitchen, filter);

  // Any change to the filter puts the reader on page one. Without this, moving
  // from page four of a month to "today" shows an empty table over a day that
  // has orders in it.
  React.useEffect(() => {
    setOffset(0);
  }, [range, status, query]);

  const rows = history.data?.items ?? [];
  const total = history.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <Toolbar ariaLabel="Order history filters">
        <SegmentedControl
          ariaLabel="Period"
          options={RANGE_OPTIONS}
          value={range}
          onValueChange={setRange}
        />
        <div className="w-[170px]">
          <Field label="Status" htmlFor="history-status">
            <Select
              id="history-status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="min-h-11"
            />
          </Field>
        </div>
        <div className="w-[220px]">
          <Field label="Find" htmlFor="history-search" hint="An order number or a dish.">
            <Input
              id="history-search"
              type="search"
              value={search}
              placeholder="40123, or Butter Chicken"
              onChange={(event) => setSearch(event.target.value)}
              className="min-h-11"
            />
          </Field>
        </div>
      </Toolbar>

      {history.isPending ? (
        <CardSkeletons count={2} label="Loading past orders" />
      ) : null}

      {history.error !== null ? (
        <LoadError
          error={history.error}
          title="Could not load past orders"
          onRetry={() => {
            void history.refetch();
          }}
        />
      ) : null}

      {history.data !== undefined ? (
        <>
          <StatRail ariaLabel="This period">
            <Stat
              label="Orders found"
              value={formatCount(total)}
              caption={describeRange(range)}
              hint="Every order matching the filters above, not just the rows on this page."
            />
            <Stat
              label="On this page"
              value={formatCount(rows.length)}
              caption={`Value ${formatMoneyRound(sumMoney(rows.map((row) => row.total_amount)))}`}
              hint="The rows currently on screen, and what they add up to. Delivered or not — this is order value, not revenue."
            />
            <Stat
              label="Delivered here"
              value={formatCount(rows.filter((row) => row.status === "delivered").length)}
              caption={`Revenue ${formatMoneyRound(
                sumMoney(
                  rows
                    .filter((row) => row.status === "delivered")
                    .map((row) => row.total_amount),
                ),
              )}`}
              hint="Delivered rows on this page only. Cancelled trade is not revenue."
            />
          </StatRail>

          {rows.length === 0 ? (
            <EmptyCard
              title="No orders match these filters"
              detail="Widen the period, clear the status, or empty the search box. An order appears here the moment it is placed, whatever happens to it afterwards."
            />
          ) : (
            <DataTableScroll
              footer={
                <>
                  <TableFooter
                    shown={rows.length}
                    total={total}
                    noun="orders"
                    sortedBy="most recently placed first"
                    extra={describeRange(range)}
                  />
                  <Pagination
                    total={total}
                    limit={PAGE_SIZE}
                    offset={offset}
                    onOffsetChange={setOffset}
                    noun="orders"
                  />
                </>
              }
            >
              <DataTable>
                <DataTableHead>
                  <DataTableRow>
                    <DataTableHeaderCell>Order</DataTableHeaderCell>
                    <DataTableHeaderCell>Placed</DataTableHeaderCell>
                    <DataTableHeaderCell>Ended as</DataTableHeaderCell>
                    <DataTableHeaderCell>Why, if refused</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Total</DataTableHeaderCell>
                  </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                  {rows.map((order) => (
                    <DataTableRow key={order.id}>
                      <DataTableCell mono>
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          #{order.id}
                        </Link>
                      </DataTableCell>
                      <DataTableCell mono className="text-ink-2">
                        {formatDateTime(order.placed_at)}
                      </DataTableCell>
                      <DataTableCell>
                        <StatusChip status={order.status} />
                      </DataTableCell>
                      <DataTableCell wrap className="max-w-[280px] text-ink-3">
                        {order.cancellation_reason ?? "—"}
                      </DataTableCell>
                      <DataTableCell numeric mono className="text-ink">
                        {formatMoney(order.total_amount)}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </DataTableScroll>
          )}
        </>
      ) : null}
    </div>
  );
}
