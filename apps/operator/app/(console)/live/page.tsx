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
import { formatClock, formatCount, formatMoney, formatOrderRef } from "../../../lib/format";
import { DECK_PAGE, DECK_PANEL, DECK_RAIL } from "../../../lib/deck";
import { getLateness, type Lateness } from "../../../lib/sla";
import {
  LIVE_REFETCH_MS,
  useCustomerDirectory,
  useLiveOrders,
  useOrderDeliveries,
  useRestaurantDirectory,
  useSummary,
} from "../../../lib/queries";
import { useNow } from "../../../lib/use-now";
import type { OrderRead } from "../../../lib/api-types";

/** Delivered and cancelled are terminal; a live board never shows them. */
const BOARD_STATUSES: readonly OrderStatus[] = ORDER_STATUSES.filter(
  (status) => status !== "delivered" && status !== "cancelled",
);

/** A rider is only attached once an order is off the pass. */
const RIDER_STATUSES: readonly OrderStatus[] = ["ready_for_pickup", "out_for_delivery"];

/** Covers and avatars in a 38px row. */
const THUMB_PX = 22;

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

interface BoardRow {
  readonly order: OrderRead;
  readonly lateness: Lateness | null;
  readonly kitchen: string;
  readonly kitchenImageUrl: string | null;
  readonly customer: string;
  readonly customerAvatarUrl: string | null;
  readonly rider: string | undefined;
}

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
        left.kitchen.localeCompare(right.kitchen) || byUrgency(left, right),
    );
  }
  return sorted.sort(byUrgency);
}

export default function LiveBoardPage(): React.JSX.Element {
  const nowMs = useNow();

  const [openOrderId, setOpenOrderId] = React.useState<number | null>(null);
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
          kitchen: kitchen?.name ?? `Restaurant ${String(order.restaurant_id)}`,
          kitchenImageUrl: kitchen?.image_url ?? null,
          customer: customer?.name ?? "—",
          customerAvatarUrl: customer?.avatar_url ?? null,
          rider: riders.data?.get(order.id)?.partner.name,
        };
      }),
    [items, nowMs, restaurants.data, customers.data, riders.data],
  );

  const filtered = React.useMemo(
    () =>
      statusFilter === ANY_STATUS
        ? rows
        : rows.filter((row) => row.order.status === statusFilter),
    [rows, statusFilter],
  );
  const visible = React.useMemo(
    () => sortRows(filtered, sortAxis),
    [filtered, sortAxis],
  );

  const lateCount = rows.filter((row) => row.lateness?.isLate === true).length;
  const platformLive = summary.data?.live_orders;
  // The board is platform-wide, so anything missing from it is the page cap and
  // nothing else. Stated on screen rather than left as a silent gap between the
  // rows and the platform count beside them.
  const beyondPage =
    platformLive === undefined ? 0 : Math.max(0, platformLive - rows.length);

  // The worst row on the board, and the one thing a rider fixes: an order
  // sitting cooked on the pass with nobody coming for it.
  const worst = rows.reduce<BoardRow | null>(
    (peak, row) =>
      (row.lateness?.lateMinutes ?? 0) > (peak?.lateness?.lateMinutes ?? 0)
        ? row
        : peak,
    null,
  );
  const worstMinutes = worst?.lateness?.lateMinutes ?? 0;
  const awaitingRider = rows.filter(
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
                  label="Listed here"
                  value={formatCount(rows.length)}
                  caption={
                    beyondPage > 0
                      ? `${formatCount(beyondPage)} more than this page holds`
                      : "Every live order on the platform"
                  }
                  hint="The rows below: every order in flight across every kitchen. A page holds 100, so on an evening busier than that the oldest live orders would not be on it — the tile at the end of this rail is what says so."
                />
                <Stat
                  label="Past promised"
                  value={formatCount(lateCount)}
                  tone={lateCount > 0 ? "alarm" : "ok"}
                  caption={
                    lateCount === 0
                      ? "Every order is inside its promise"
                      : lateCount === rows.length
                        ? "Every order on the board"
                        : `${formatCount(rows.length - lateCount)} still inside their promise`
                  }
                  hint="Orders already past the time the customer was promised. They are at the top of the board."
                />
                <Stat
                  label="Worst"
                  value={worstMinutes > 0 ? formatLate(worstMinutes) : "—"}
                  caption={
                    worst === null || worstMinutes <= 0
                      ? "Nothing is past its promise"
                      : `${formatOrderRef(worst.order.id)} · ${worst.customer}`
                  }
                  hint="The order that has been waiting longest past the time it was promised."
                />
                <Stat
                  label="Waiting for a rider"
                  value={formatCount(awaitingRider)}
                  tone={awaitingRider > 0 ? "warn" : "default"}
                  caption={
                    awaitingRider > 0
                      ? "Cooked, on the pass, nobody coming"
                      : "Every cooked order has a rider"
                  }
                  hint="Ready for pickup with no delivery partner assigned. The food is getting colder and the clock is still running."
                />
                <Stat
                  label="Live platform-wide"
                  value={
                    platformLive === undefined ? "—" : formatCount(platformLive)
                  }
                  caption={
                    beyondPage > 0
                      ? `${formatCount(beyondPage)} not on this page`
                      : "All of them are listed"
                  }
                  hint="Every order in flight, counted platform-wide rather than by adding up the rows below. The two agreeing is how you know the board is showing all of it."
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
              <FilterChip
                label="Every kitchen"
                tone="accent"
                title="The board is platform-wide. It is not scoped to one kitchen's orders."
              />
            </Toolbar>

            <BoardFrame
              shown={visible.length}
              total={rows.length}
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
                      selected={row.order.id === openOrderId}
                      onOpen={setOpenOrderId}
                    />
                  ))}
                </DataTableBody>
              </DataTable>
            </BoardFrame>

            {visible.length === 0 && statusFilter !== ANY_STATUS ? (
              <p className="font-sans text-[12px] text-ink-3">
                Nothing is{" "}
                {getOrderStatusLabel(statusFilter as OrderStatus).toLowerCase()}{" "}
                right now — clear the state filter to see the rest of the board.
              </p>
            ) : null}
          </>
        )}
      </QueryState>
      <OrderDrawer
        orderId={openOrderId}
        onClose={() => setOpenOrderId(null)}
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
  selected,
  onOpen,
}: {
  readonly row: BoardRow;
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
      <DataTableCell className="max-w-[190px] text-ink">
        <span className="flex items-center gap-2">
          <Thumb src={row.kitchenImageUrl} name={row.kitchen} size={THUMB_PX} />
          <span className="truncate">{row.kitchen}</span>
        </span>
      </DataTableCell>
      <DataTableCell className="max-w-[170px] text-ink-2">
        <span className="flex items-center gap-2">
          <Thumb
            src={row.customerAvatarUrl}
            name={row.customer}
            size={THUMB_PX}
            shape="circle"
          />
          <span className="truncate">{row.customer}</span>
        </span>
      </DataTableCell>
      <DataTableCell>
        <StatusChip status={order.status} />
      </DataTableCell>
      <DataTableCell mono>{formatClock(order.promised_at)}</DataTableCell>
      <DataTableCell>
        {lateness === null ? (
          <span className="text-ink-4">—</span>
        ) : (
          <span className={SEVERITY_TEXT[tier]}>{lateness.label}</span>
        )}
      </DataTableCell>
      <DataTableCell numeric>{formatMoney(order.total_amount)}</DataTableCell>
      <DataTableCell className="max-w-[150px] text-ink-3">
        {row.rider ?? <span className="text-ink-4">not assigned</span>}
      </DataTableCell>
    </DataTableRow>
  );
}
