"use client";

import * as React from "react";
import Link from "next/link";
import {
  Button,
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
  getOrderStatusLabel,
} from "@repo/ui";
import { CardSkeletons, EmptyCard, LoadError } from "../_components/states";
import {
  daysAgoDate,
  formatCount,
  formatDateTime,
  formatMoney,
  formatMoneyRound,
  sumMoney,
  toLocalDate,
} from "../_lib/format";
import { RANGE_OPTIONS, describeRange, windowFor, type RangeKey } from "../_lib/windows";
import { useDebouncedValue } from "../_lib/use-debounced";
import { useOrderHistory } from "../../lib/queries/orders";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { OrderStatus } from "../../lib/types";

const PAGE_SIZE = 25;

/**
 * History looks further back than the reports do. The three shared ranges
 * answer "how is the day, the week, the month going"; this screen answers "find
 * that order", and an order from six weeks ago could not be found at all — while
 * the empty state told the reader to widen a period that was already as wide as
 * it went. So History alone adds a quarter and everything.
 */
type HistoryRange = RangeKey | "90d" | "all";

const HISTORY_RANGE_OPTIONS: readonly {
  readonly value: HistoryRange;
  readonly label: string;
}[] = [
  ...RANGE_OPTIONS,
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

const QUARTER_DAYS_BACK = 89;

/** The placed-at bounds for a range, or none at all for "All time". */
function placedBounds(
  range: HistoryRange,
  now: number,
): { readonly placedFrom?: string; readonly placedTo?: string } {
  if (range === "all") return {};
  const window =
    range === "90d"
      ? { from: daysAgoDate(QUARTER_DAYS_BACK, now), to: toLocalDate(now) }
      : windowFor(range, now);
  return { placedFrom: startOfDayIso(window.from), placedTo: endOfDayIso(window.to) };
}

function describeHistoryRange(range: HistoryRange): string {
  if (range === "all") return "Every order this restaurant has taken";
  if (range === "90d") return `Today and the previous ${QUARTER_DAYS_BACK} days`;
  return describeRange(range);
}

/**
 * "Any status" plus the seven the machine actually has, in the words the
 * status chips use — "Ready for pickup", not the wire's "ready for pickup".
 */
const STATUS_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: "", label: "Any status" },
  ...ORDER_STATUSES.map((status) => ({
    value: status,
    label: getOrderStatusLabel(status),
  })),
];

/** The same label style as `Field`, for the control that is not an input. */
const CONTROL_LABEL = "font-sans text-[13px] font-medium text-ink-2";

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
  const [range, setRange] = React.useState<HistoryRange>("7d");
  const [status, setStatus] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [offset, setOffset] = React.useState(0);

  // Typed straight into a query key, so every keystroke would be a request.
  const query = useDebouncedValue(search, 300);

  const bounds = React.useMemo(() => placedBounds(range, now), [range, now]);

  const filter = React.useMemo(
    () => ({
      status: status === "" ? undefined : (status as OrderStatus),
      ...bounds,
      q: query.trim() === "" ? undefined : query.trim(),
      limit: PAGE_SIZE,
      offset,
    }),
    [status, bounds, query, offset],
  );

  // No example dish. "Order no. or e.g. Masala Chai" was clipped mid-word in
  // the field at 820px, and a borrowed dish name ("Butter Chicken" on a chai
  // café) read as somebody else's screen. Short enough to fit at any width.
  const placeholder = "Order no. or dish";

  const history = useOrderHistory(kitchen, filter);
  // "Delivered in period" has to be the period, not the 25 rows on screen, so
  // it asks for the count alone: one row, read for its total.
  const deliveredFilter = React.useMemo(
    () => ({ ...filter, status: "delivered" as const, limit: 1, offset: 0 }),
    [filter],
  );
  const delivered = useOrderHistory(kitchen, deliveredFilter);
  const isOtherStatus = status !== "" && status !== "delivered";

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
      {/* Three controls, one line, a label above each. The period had none and
          Find had a hint underneath, so the three sat 12px off one another and
          read as three unrelated widgets. Bottom-aligned at one 48px height,
          so their tops line up too, and each period button is a full 42px
          target inside its 48px track. */}
      <Toolbar ariaLabel="Order history filters">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <span id="history-period" className={CONTROL_LABEL}>
              Period
            </span>
            <SegmentedControl
              ariaLabel="Period"
              options={HISTORY_RANGE_OPTIONS}
              value={range}
              onValueChange={setRange}
              className="min-h-12 [&>button]:min-h-[42px] [&>button]:text-[14px]"
            />
          </div>
          <div className="w-[170px]">
            <Field label="Status" htmlFor="history-status">
              <Select
                id="history-status"
                options={STATUS_OPTIONS}
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="min-h-12"
              />
            </Field>
          </div>
          <div className="min-w-[180px] flex-1 lg:max-w-[300px]">
            <Field label="Find" htmlFor="history-search">
              <Input
                id="history-search"
                type="search"
                value={search}
                placeholder={placeholder}
                onChange={(event) => setSearch(event.target.value)}
                className="min-h-12"
              />
            </Field>
          </div>
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
              caption={describeHistoryRange(range)}
              hint="Every order matching the filters above, not just the rows on this page."
            />
            <Stat
              label="On this page"
              value={formatCount(rows.length)}
              caption={`Value ${formatMoneyRound(sumMoney(rows.map((row) => row.total_amount)))}`}
              hint="The rows currently on screen, and what they add up to. Delivered or not — this is order value, not revenue."
            />
            <Stat
              label="Delivered in period"
              value={
                isOtherStatus
                  ? "0"
                  : delivered.data === undefined
                    ? "—"
                    : formatCount(delivered.data.total)
              }
              caption={`Revenue ${formatMoneyRound(
                sumMoney(
                  rows
                    .filter((row) => row.status === "delivered")
                    .map((row) => row.total_amount),
                ),
              )}${total > rows.length ? " on this page" : ""}`}
              hint="Delivered orders in the whole period; the revenue beside it is the delivered rows on this page. Cancelled trade is not revenue."
            />
          </StatRail>

          {rows.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <EmptyCard
                title="No orders match these filters"
                detail={
                  range === "all"
                    ? "Clear the status or empty the search box. An order appears here the moment it is placed, whatever happens to it afterwards."
                    : "Nothing was placed in this period with these filters. An order appears here the moment it is placed, whatever happens to it afterwards."
                }
              />
              {/* The way out, as a button rather than advice: "widen the
                  period" was the hint, and it pointed at a control already
                  at its widest. */}
              {range === "all" ? null : (
                <Button variant="outline" className="min-h-11" onClick={() => setRange("all")}>
                  Show all time
                </Button>
              )}
            </div>
          ) : (
            <DataTableScroll
              footer={
                <>
                  <TableFooter
                    shown={rows.length}
                    total={total}
                    noun="orders"
                    sortedBy="most recently placed first"
                    extra={describeHistoryRange(range)}
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
