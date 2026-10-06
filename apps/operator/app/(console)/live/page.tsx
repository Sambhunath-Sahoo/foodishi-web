"use client";

import * as React from "react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  EmptyState,
  FilterChip,
  formatLate,
  Freshness,
  getOrderStatusLabel,
  LiveDot,
  ORDER_STATUSES,
  PageTitle,
  SegmentedControl,
  Select,
  SEVERITY_LABEL,
  SEVERITY_TEXT,
  SeverityCell,
  Skeleton,
  Stat,
  StatRail,
  StatusChip,
  TableFooter,
  Toolbar,
  type OrderStatus,
} from "@repo/ui";
import { BoardSkeleton, RailSkeleton } from "../../../components/board-skeleton";
import {
  CustomerCell,
  KitchenCell,
  lookupOf,
  RIDER_STATUSES,
  RiderCell,
  type BoardLookups,
  type BoardRow,
  type Lookup,
} from "../../../components/live-rows";
import { OrderDrawer } from "../../../components/order-drawer";
import { QueryState } from "../../../components/query-state";
import { StuckOrders } from "../../../components/stuck-orders";
import { ToolbarHint } from "../../../components/toolbar-hint";
import { formatClock, formatCount, formatMoney, formatOrderRef } from "../../../lib/format";
import { DECK_PAGE, DECK_PANEL, DECK_RAIL } from "../../../lib/deck";
import { getLateness, isStuck } from "../../../lib/sla";
import {
  LIVE_REFETCH_MS,
  useCustomerDirectory,
  useLiveOrders,
  useOrderDeliveries,
  useRestaurantDirectory,
  useSummary,
} from "../../../lib/queries";
import { useNow } from "../../../lib/use-now";
import { useOpenOrder } from "../../../lib/use-open-order";

/** Delivered and cancelled are terminal; a live board never shows them. */
const BOARD_STATUSES: readonly OrderStatus[] = ORDER_STATUSES.filter(
  (status) => status !== "delivered" && status !== "cancelled",
);

type SortAxis = "urgency" | "status" | "kitchen";

const SORT_OPTIONS = [
  { value: "urgency" as const, label: "Urgency" },
  { value: "status" as const, label: "Status" },
  { value: "kitchen" as const, label: "Kitchen" },
];

const SORTED_BY: Record<SortAxis, string> = {
  urgency: "minutes past promised, worst first",
  status: "state, then minutes past promised",
  kitchen: "kitchen, then minutes past promised",
};

const ANY_STATUS = "any";

/** Worst first within whatever the primary axis is. */
function byUrgency(left: BoardRow, right: BoardRow): number {
  return (right.lateness?.lateMinutes ?? 0) - (left.lateness?.lateMinutes ?? 0);
}

function sortRows(rows: readonly BoardRow[], axis: SortAxis): readonly BoardRow[] {
  const sorted = [...rows];
  if (axis === "status") {
    return sorted.sort(
      (left, right) =>
        BOARD_STATUSES.indexOf(left.order.status) -
          BOARD_STATUSES.indexOf(right.order.status) || byUrgency(left, right),
    );
  }
  if (axis === "kitchen") {
    return sorted.sort(
      (left, right) =>
        (left.kitchen ?? "").localeCompare(right.kitchen ?? "") ||
        byUrgency(left, right),
    );
  }
  return sorted.sort(byUrgency);
}

export default function LiveBoardPage(): React.JSX.Element {
  const nowMs = useNow();

  // In the URL as ?order=, so an open order survives a reload and can be
  // pasted to a colleague (OP-4).
  const {
    orderId: openOrderId,
    open: openOrder,
    close: closeOrder,
  } = useOpenOrder();
  const [sortAxis, setSortAxis] = React.useState<SortAxis>("urgency");
  const [statusFilter, setStatusFilter] = React.useState<string>(ANY_STATUS);

  const liveOrders = useLiveOrders();
  const restaurants = useRestaurantDirectory();
  const customers = useCustomerDirectory();
  const summary = useSummary();

  const items = React.useMemo(
    () => liveOrders.data?.items ?? [],
    [liveOrders.data],
  );

  const riderOrderIds = React.useMemo(
    () =>
      items
        .filter((order) => RIDER_STATUSES.includes(order.status))
        .map((order) => order.id),
    [items],
  );
  const riders = useOrderDeliveries(riderOrderIds);

  const rows = React.useMemo<readonly BoardRow[]>(
    () =>
      items.map((order) => {
        const kitchen = restaurants.data?.get(order.restaurant_id);
        const customer = customers.data?.get(order.user_id);

        return {
          order,
          // Lateness comes off the wall clock, so it waits for the client to
          // have one rather than rendering a figure the server cannot agree
          // with.
          lateness: nowMs === null ? null : getLateness(order, nowMs),
          kitchen: kitchen?.name,
          kitchenImageUrl: kitchen?.image_url ?? null,
          customer: customer?.name,
          customerAvatarUrl: customer?.avatar_url ?? null,
          rider: riders.data?.get(order.id)?.partner.name,
        };
      }),
    [items, nowMs, restaurants.data, customers.data, riders.data],
  );

  // A disabled query (no order is off the pass) reports `isPending` forever,
  // and "still loading" is not true of a lookup nobody needed to make.
  const riderLookup: Lookup =
    riderOrderIds.length === 0 ? "ready" : lookupOf(riders);
  const lookups = React.useMemo<BoardLookups>(
    () => ({
      kitchens: lookupOf(restaurants),
      customers: lookupOf(customers),
      riders: riderLookup,
    }),
    [restaurants, customers, riderLookup],
  );

  // Stuck orders leave the queue (OP-3). Until the clock is known nothing is
  // judged stuck, so the first frame cannot move rows between the two lists.
  const live = React.useMemo(
    () =>
      nowMs === null ? rows : rows.filter((row) => !isStuck(row.order, nowMs)),
    [rows, nowMs],
  );
  const stuck = React.useMemo(
    () =>
      nowMs === null
        ? []
        : rows
            .filter((row) => isStuck(row.order, nowMs))
            .sort(byUrgency),
    [rows, nowMs],
  );

  const filtered = React.useMemo(
    () =>
      statusFilter === ANY_STATUS
        ? live
        : live.filter((row) => row.order.status === statusFilter),
    [live, statusFilter],
  );
  const visible = React.useMemo(
    () => sortRows(filtered, sortAxis),
    [filtered, sortAxis],
  );

  const lateCount = live.filter((row) => row.lateness?.isLate === true).length;
  const platformLive = summary.data?.live_orders;
  // The board is platform-wide, so anything missing from it is the page cap and
  // nothing else. Stated on screen rather than left as a silent gap between the
  // rows and the platform count beside them.
  const beyondPage =
    platformLive === undefined ? 0 : Math.max(0, platformLive - rows.length);

  // The worst row on the queue, and the one thing a rider fixes: an order
  // sitting cooked on the pass with nobody coming for it. Both read the queue
  // only — a stuck order six weeks past its promise is not "the worst" thing to
  // do next, it is a different job.
  const worst = live.reduce<BoardRow | null>(
    (peak, row) =>
      (row.lateness?.lateMinutes ?? 0) > (peak?.lateness?.lateMinutes ?? 0)
        ? row
        : peak,
    null,
  );
  const worstMinutes = worst?.lateness?.lateMinutes ?? 0;
  const awaitingRider = live.filter(
    (row) => row.order.status === "ready_for_pickup" && row.rider === undefined,
  ).length;

  const statusOptions = React.useMemo(
    () => [
      { value: ANY_STATUS, label: "Any state" },
      ...BOARD_STATUSES.map((status) => ({
        value: status,
        label: getOrderStatusLabel(status),
      })),
    ],
    [],
  );

  return (
    <div className={DECK_PAGE}>
      <PageTitle subtitle="Every order still in flight, worst first.">
        Live board
      </PageTitle>

      <QueryState
        query={liveOrders}
        errorTitle="The live board could not load"
        emptyTitle="Nothing in flight right now"
        emptyDetail="Orders appear here the moment they are placed and leave when they are delivered or cancelled."
        isEmpty={(page) => page.items.length === 0}
        skeleton={
          <>
            <RailSkeleton label="Counting what is in flight" />
            <BoardSkeleton
              label="Loading the live board"
              note="Reading every order still in flight…"
            />
          </>
        }
      >
        {() => (
          <>
            <div className={DECK_RAIL}>
              <StatRail ariaLabel="What is in flight across the platform">
                <Stat
                  label="On the queue"
                  value={formatCount(live.length)}
                  caption={
                    beyondPage > 0
                      ? `${formatCount(beyondPage)} more than this page holds`
                      : stuck.length > 0
                        ? `${formatCount(rows.length)} live, less ${formatCount(stuck.length)} stuck`
                        : "Every live order on the platform"
                  }
                  hint="The rows below: every order in flight across every kitchen that is not stuck. A page holds 100, so on an evening busier than that the oldest live orders would not be on it — this caption is what says so."
                />
                <Stat
                  label="Past promised"
                  value={formatCount(lateCount)}
                  tone={lateCount > 0 ? "alarm" : "ok"}
                  caption={
                    lateCount === 0
                      ? "Every order is inside its promise"
                      : lateCount === live.length
                        ? "Every order on the queue"
                        : `${formatCount(live.length - lateCount)} still inside their promise`
                  }
                  hint="Orders on the queue already past the time the customer was promised. They are at the top of the board. Stuck orders are counted separately."
                />
                <Stat
                  label="Worst"
                  value={worstMinutes > 0 ? formatLate(worstMinutes) : "—"}
                  caption={
                    worst === null || worstMinutes <= 0
                      ? "Nothing on the queue is late"
                      : `${formatOrderRef(worst.order.id)} · ${worst.customer ?? "—"}`
                  }
                  hint="The order on the queue that has been waiting longest past the time it was promised. Stuck orders are left out: they are past the point where ranking them helps."
                />
                <Stat
                  label="Waiting for a rider"
                  value={
                    riderLookup === "loading" ? (
                      <Skeleton
                        className="inline-block h-[20px] w-[60px] align-bottom"
                        label="Checking which orders have a rider"
                      />
                    ) : riderLookup === "error" ? (
                      "—"
                    ) : (
                      formatCount(awaitingRider)
                    )
                  }
                  tone={riderLookup === "ready" && awaitingRider > 0 ? "warn" : "default"}
                  caption={
                    riderLookup === "loading"
                      ? "Checking the riders…"
                      : riderLookup === "error"
                        ? "The rider lookup failed"
                        : awaitingRider > 0
                          ? "Cooked, on the pass, nobody coming"
                          : "Every cooked order has a rider"
                  }
                  hint="Ready for pickup with no delivery partner assigned. The food is getting colder and the clock is still running."
                />
                <Stat
                  label="Stuck"
                  value={formatCount(stuck.length)}
                  caption={
                    stuck.length > 0
                      ? "Over 6 h past promise · listed below"
                      : "Nothing is more than 6 h past its promise"
                  }
                  hint="Live orders more than six hours past the time the customer was promised. They are off the queue because no rider or kitchen fixes them now — each needs a cancel-and-refund decision."
                />
              </StatRail>
            </div>

            <Toolbar
              ariaLabel="Live board filters"
              right={
                <LiveDot
                  interval={LIVE_REFETCH_MS / 1000}
                  at={
                    liveOrders.dataUpdatedAt === 0
                      ? null
                      : liveOrders.dataUpdatedAt
                  }
                  paused={liveOrders.isError}
                />
              }
            >
              <SegmentedControl
                ariaLabel="Sort the board by"
                options={SORT_OPTIONS}
                value={sortAxis}
                onValueChange={setSortAxis}
              />
              <Select
                aria-label="Show only one state"
                options={statusOptions}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-8 w-[150px] text-[13px]"
              />
              {statusFilter === ANY_STATUS ? null : (
                <FilterChip
                  label="State"
                  value={getOrderStatusLabel(statusFilter as OrderStatus)}
                  onDismiss={() => setStatusFilter(ANY_STATUS)}
                />
              )}
              <ToolbarHint>
                Every kitchen, platform-wide — not scoped to one kitchen&apos;s
                orders.
              </ToolbarHint>
            </Toolbar>

            {live.length === 0 ? (
              <div className="shrink-0 rounded-card border border-line bg-surface">
                <EmptyState
                  title="Nothing live inside six hours of its promise"
                  detail={
                    stuck.length > 0
                      ? `The ${formatCount(stuck.length)} older live orders are stuck rather than late, so they are listed below instead of here. New orders appear on this board the moment they are placed.`
                      : "Orders appear here the moment they are placed and leave when they are delivered or cancelled."
                  }
                />
              </div>
            ) : (
              <BoardFrame
                shown={visible.length}
                total={live.length}
                sortedBy={SORTED_BY[sortAxis]}
                beyondPage={beyondPage}
                updatedAt={
                  liveOrders.dataUpdatedAt === 0 ? null : liveOrders.dataUpdatedAt
                }
              >
                <DataTable aria-label="Live orders, worst first">
                  <DataTableHead>
                    <tr>
                      <DataTableHeaderCell className="pl-4">Order</DataTableHeaderCell>
                      <DataTableHeaderCell>Kitchen</DataTableHeaderCell>
                      <DataTableHeaderCell>Customer</DataTableHeaderCell>
                      <DataTableHeaderCell>State</DataTableHeaderCell>
                      <DataTableHeaderCell>Due</DataTableHeaderCell>
                      <DataTableHeaderCell>Late by</DataTableHeaderCell>
                      <DataTableHeaderCell numeric>Total</DataTableHeaderCell>
                      <DataTableHeaderCell>Rider</DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {visible.map((row) => (
                      <BoardTableRow
                        key={row.order.id}
                        row={row}
                        lookups={lookups}
                        nowMs={nowMs}
                        selected={row.order.id === openOrderId}
                        onOpen={openOrder}
                      />
                    ))}
                  </DataTableBody>
                </DataTable>
              </BoardFrame>
            )}

            {visible.length === 0 && live.length > 0 && statusFilter !== ANY_STATUS ? (
              <p className="font-sans text-[12px] text-ink-3">
                Nothing is{" "}
                {getOrderStatusLabel(statusFilter as OrderStatus).toLowerCase()}{" "}
                right now — clear the state filter to see the rest of the board.
              </p>
            ) : null}

            {nowMs === null ? null : (
              <StuckOrders
                rows={stuck}
                lookups={lookups}
                nowMs={nowMs}
                selectedOrderId={openOrderId}
                onOpen={openOrder}
              />
            )}
          </>
        )}
      </QueryState>
      <OrderDrawer
        orderId={openOrderId}
        onClose={() => closeOrder()}
      />
    </div>
  );
}

/** The bordered frame plus the footer that states the shape of the board. */
function BoardFrame({
  shown,
  total,
  sortedBy,
  beyondPage,
  updatedAt,
  children,
}: {
  readonly shown: number;
  readonly total: number;
  readonly sortedBy: string;
  /** Live orders the server counts that this page could not fit. */
  readonly beyondPage: number;
  readonly updatedAt: number | null;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <DataTableScroll
      className={DECK_PANEL}
      footer={
        <TableFooter
          shown={shown}
          total={total}
          noun="live orders"
          sortedBy={sortedBy}
          updated={<Freshness at={updatedAt} />}
          extra={
            beyondPage > 0
              ? `${formatCount(beyondPage)} more are live than this page holds — it is the newest ${formatCount(shown)}`
              : undefined
          }
        />
      }
    >
      {children}
    </DataTableScroll>
  );
}

function BoardTableRow({
  row,
  lookups,
  nowMs,
  selected,
  onOpen,
}: {
  readonly row: BoardRow;
  readonly lookups: BoardLookups;
  readonly nowMs: number | null;
  readonly selected: boolean;
  readonly onOpen: (orderId: number) => void;
}): React.JSX.Element {
  const { order, lateness } = row;
  const tier = lateness?.tier ?? 0;

  return (
    <DataTableRow
      selected={selected}
      onClick={() => onOpen(order.id)}
      className="cursor-pointer"
    >
      <SeverityCell tier={tier} title={SEVERITY_LABEL[tier]}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(order.id);
          }}
          aria-label={`Open order ${formatOrderRef(order.id)}`}
          className="rounded-card font-mono text-[12px] font-medium text-accent underline underline-offset-2 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {formatOrderRef(order.id)}
        </button>
      </SeverityCell>
      <KitchenCell row={row} lookup={lookups.kitchens} />
      <CustomerCell row={row} lookup={lookups.customers} />
      <DataTableCell>
        <StatusChip status={order.status} />
      </DataTableCell>
      <DataTableCell mono>
        {formatClock(order.promised_at, nowMs ?? undefined)}
      </DataTableCell>
      <DataTableCell>
        {lateness === null ? (
          <span className="text-ink-4">—</span>
        ) : (
          <span className={SEVERITY_TEXT[tier]}>{lateness.label}</span>
        )}
      </DataTableCell>
      <DataTableCell numeric>{formatMoney(order.total_amount)}</DataTableCell>
      <RiderCell row={row} lookup={lookups.riders} />
    </DataTableRow>
  );
}
