"use client";

import * as React from "react";
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  FilterChip,
  Freshness,
  Input,
  LiveDot,
  Pagination,
  PageTitle,
  SEVERITY_LABEL,
  SEVERITY_TEXT,
  SeverityCell,
  TableFooter,
  Thumb,
  Toolbar,
  type Tone,
} from "@repo/ui";
import { BoardSkeleton, RailSkeleton } from "../../../components/board-skeleton";
import {
  DeliveryActionDialog,
  type DeliveryAction,
} from "../../../components/delivery-actions";
import { OrderDrawer } from "../../../components/order-drawer";
import { QueryState } from "../../../components/query-state";
import { RowAction, RowActions } from "../../../components/row-action";
import { StageCards, type Stage } from "../../../components/stage-cards";
import {
  formatClock,
  formatCount,
  formatDuration,
  formatMoney,
  formatOrderRef,
  humanizeEnum,
} from "../../../lib/format";
import { DECK_PAGE, DECK_PANEL } from "../../../lib/deck";
import { getPromiseOutcome, tallyLate } from "../../../lib/sla";
import {
  DELIVERY_PAGE_SIZE,
  LIVE_REFETCH_MS,
  useActiveRides,
  useDeliveries,
  useDeliveryCounts,
  useDeliveryPartners,
  useRestaurantDirectory,
} from "../../../lib/queries";
import { useNow } from "../../../lib/use-now";
import type { DeliveryStatus } from "../../../lib/api-types";
import type { DeliveryBoardRow, DeliveryFilter } from "../../../lib/services/types";
import { useOpenOrder } from "../../../lib/use-open-order";

/** The kitchen cover in a 38px row. */
const THUMB_PX = 22;


const SCOPE_WORDS: Record<DeliveryFilter, string> = {
  active: "rides still on the road",
  assigned: "rides waiting to be picked up",
  picked_up: "rides carrying an order",
  failed: "rides that failed",
  delivered: "rides that finished",
  any: "every ride on record",
};

const STATUS_TONE: Record<DeliveryStatus, Tone> = {
  assigned: "warn",
  picked_up: "cool",
  delivered: "ok",
  failed: "crit",
};

/**
 * Who is on the road, and what to do about the ones who are not moving.
 *
 * The board defaults to rides still out rather than every ride ever made,
 * because the two questions this screen exists for — where is my order, and who
 * needs help — are both about right now. Delivered rides are one tap away and
 * are never the first thing on screen.
 *
 * The lateness column measures the *order's* promise, not the rider's ETA. A
 * rider fifteen minutes into a twenty-minute ride is doing fine; the order they
 * are carrying may still be an hour past what the customer was told, and that is
 * the number somebody has to act on.
 */
export default function DeliveriesPage(): React.JSX.Element {
  const nowMs = useNow();
  const [scope, setScope] = React.useState<DeliveryFilter>("active");
  const [term, setTerm] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  // In the URL as ?order=, so an open order survives a reload and can be
  // pasted to a colleague (OP-4).
  const {
    orderId: openOrderId,
    open: openOrder,
    close: closeOrder,
  } = useOpenOrder();
  const [acting, setActing] = React.useState<{
    readonly row: DeliveryBoardRow;
    readonly action: DeliveryAction;
  } | null>(null);

  const deliveries = useDeliveries({
    q: query,
    status: scope,
    limit: DELIVERY_PAGE_SIZE,
    offset,
  });
  const restaurants = useRestaurantDirectory();
  const partners = useDeliveryPartners();
  const counts = useDeliveryCounts();
  // Lateness platform-wide, not on this page: the rail used to count it from
  // whatever rows the filter had produced, which meant switching to "Handed
  // over" quietly reported nothing late. Counted from every active ride rather
  // than `workload.deliveries_late`, which calls a six-week-old ride late too —
  // the same split the rail makes, so the two never disagree (OP-3).
  const activeRides = useActiveRides();
  const rideTally =
    nowMs === null || activeRides.data === undefined
      ? undefined
      : tallyLate(
          activeRides.data.items.map((row) => row.order),
          nowMs,
        );

  const submitSearch = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setQuery(term.trim());
      setOffset(0);
    },
    [term],
  );

  const changeScope = React.useCallback((next: DeliveryFilter) => {
    setScope(next);
    setOffset(0);
  }, []);

  const ridersFree = (partners.data ?? []).filter((row) => row.is_available).length;

  /**
   * The filter, as the board it always should have been.
   *
   * Counted from `useDeliveryCounts` and not from the rows on screen: a card row
   * fed by the current page could only ever describe the filter already applied,
   * which is the one thing the reader does not need telling.
   *
   * "Awaiting pickup" is the loud one. A rider assigned and not collecting is
   * food going cold on a counter with the clock still running — the only stage
   * here where waiting costs the customer something and nobody has noticed.
   */
  const stages: readonly Stage<DeliveryFilter>[] = React.useMemo(
    () => [
      {
        value: "assigned",
        label: "Awaiting pickup",
        caption: "Rider assigned, not collected",
        count: counts.data?.assigned,
        tone: "warn",
        chip: <Badge tone="warn">Assigned</Badge>,
      },
      {
        value: "picked_up",
        label: "On the road",
        caption: "Carrying an order now",
        count: counts.data?.picked_up,
        chip: <Badge tone="cool">Picked up</Badge>,
      },
      {
        value: "failed",
        label: "Failed",
        caption: "Given up on, with a reason",
        count: counts.data?.failed,
        tone: "crit",
        chip: <Badge tone="crit">Failed</Badge>,
      },
      {
        value: "delivered",
        label: "Handed over",
        caption: "Finished, all time",
        count: counts.data?.delivered,
        chip: <Badge tone="ok">Delivered</Badge>,
      },
    ],
    [counts.data],
  );

  // Built once and rendered in two places: above the table, and above the
  // empty state. A search or a filter that matches nothing must leave the
  // controls on screen to undo it — inside the results they vanished with the
  // rows, and "clear the filters" pointed at filters nobody could see.
  const filters = (
    <Toolbar
      ariaLabel="Delivery filters"
      right={
        <LiveDot
          interval={LIVE_REFETCH_MS / 1000}
          at={
            deliveries.dataUpdatedAt === 0 ? null : deliveries.dataUpdatedAt
          }
          paused={deliveries.isError}
        />
      }
    >
      <form onSubmit={submitSearch} className="flex items-center gap-2">
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Order or rider"
          aria-label="Search deliveries by order id, rider name or phone"
          className="h-8 w-[200px] text-[13px]"
        />
      </form>
      {query === "" ? null : (
        <FilterChip
          label="Matching"
          value={query}
          onDismiss={() => {
            setTerm("");
            setQuery("");
            setOffset(0);
          }}
        />
      )}
    </Toolbar>
  );

  return (
    <div className={DECK_PAGE}>
      <PageTitle subtitle="Every ride out there, and the two things to do about one that has stopped.">
        Deliveries
      </PageTitle>

      <StageCards
        ariaLabel="Which rides to show"
        stages={stages}
        // A ring means "you pressed this". The default "still out" view and
        // "every ride" are not a press, so no card is ringed under them —
        // ringing all of them said every card was selected, which is the
        // same as saying none is (OP-6). The note below names the default.
        active={scope === "active" || scope === "any" ? [] : [scope]}
        // Pressing the ringed card again goes back to the default view.
        onSelect={(next) => changeScope(next === scope ? "active" : next)}
        note={
          counts.data === undefined ? (
            "Counting rides…"
          ) : (
            <>
              <button
                type="button"
                onClick={() => changeScope("active")}
                className="font-medium text-accent underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {formatCount(counts.data.assigned + counts.data.picked_up)} still out
              </button>{" "}
              across both live stages
              {rideTally === undefined || rideTally.late === 0 ? null : (
                <>
                  ,{" "}
                  <span className="font-semibold text-crit">
                    {formatCount(rideTally.late)} past the promise
                  </span>
                </>
              )}
              {rideTally === undefined || rideTally.stuck === 0 ? null : (
                <>
                  ,{" "}
                  <span className="font-medium text-ink-2">
                    {formatCount(rideTally.stuck)} stuck
                  </span>{" "}
                  over 6 h
                </>
              )}{" "}
              ·{" "}
              <span className="font-medium text-ink-2">
                {partners.data === undefined ? "—" : formatCount(ridersFree)}
              </span>{" "}
              of {formatCount(partners.data?.length ?? 0)} riders free ·{" "}
              <button
                type="button"
                onClick={() => changeScope("any")}
                className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                every ride on record
              </button>
            </>
          )
        }
      />

      <QueryState
        query={deliveries}
        emptyLead={filters}
        errorTitle="The deliveries board could not load"
        emptyTitle={
          query === ""
            ? `No ${SCOPE_WORDS[scope]} right now`
            : `Nothing matches “${query}”`
        }
        emptyDetail={
          query === ""
            ? "A ride appears here the moment a rider is assigned, and leaves when the order is handed over."
            : "The search matches an order id, a rider's name, their phone number and their vehicle."
        }
        isEmpty={(page) => page.items.length === 0}
        skeleton={
          <>
            <RailSkeleton label="Counting what is on the road" />
            <BoardSkeleton
              rows={10}
              label="Loading the deliveries board"
              note="Reading every ride…"
            />
          </>
        }
      >
        {(page) => {
          const rows = page.items.map((row) => ({
            row,
            outcome: nowMs === null ? null : getPromiseOutcome(row.order, nowMs),
            kitchen: restaurants.data?.get(row.order.restaurant_id),
          }));

          return (
            <>
              {filters}

              <DataTableScroll
                className={DECK_PANEL}
                footer={
                  <>
                    <TableFooter
                      shown={page.items.length}
                      total={page.total}
                      noun="deliveries"
                      sortedBy="rides still out first, then the most recently assigned"
                      updated={
                        <Freshness
                          at={
                            deliveries.dataUpdatedAt === 0
                              ? null
                              : deliveries.dataUpdatedAt
                          }
                        />
                      }
                      extra={`showing ${SCOPE_WORDS[scope]}`}
                    />
                    <Pagination
                      total={page.total}
                      limit={page.limit}
                      offset={page.offset}
                      onOffsetChange={setOffset}
                      noun="deliveries"
                      className="border-t border-line"
                    />
                  </>
                }
              >
                <DataTable aria-label="Deliveries, rides still out first">
                  <DataTableHead>
                    <tr>
                      <DataTableHeaderCell className="pl-4">Order</DataTableHeaderCell>
                      <DataTableHeaderCell>Kitchen</DataTableHeaderCell>
                      <DataTableHeaderCell>Rider</DataTableHeaderCell>
                      <DataTableHeaderCell>Ride</DataTableHeaderCell>
                      <DataTableHeaderCell>Assigned</DataTableHeaderCell>
                      <DataTableHeaderCell numeric>Distance</DataTableHeaderCell>
                      {/* "Promise", not "Against its promise": the header was
                          the widest thing in its column, and the longer action
                          labels (OP-8) and dated Assigned times (OP-3) need the
                          room to keep "Mark failed…" on screen at 1366. */}
                      <DataTableHeaderCell>Promise</DataTableHeaderCell>
                      <DataTableHeaderCell numeric>Order value</DataTableHeaderCell>
                      <DataTableHeaderCell numeric>Step in</DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {rows.map(({ row, outcome, kitchen }) => {
                      const tier = outcome?.tier ?? 0;
                      const isFinished = row.delivery.status === "delivered";
                      const kitchenName =
                        kitchen?.name ??
                        `Restaurant ${String(row.order.restaurant_id)}`;

                      return (
                        <DataTableRow
                          key={row.delivery.id}
                          selected={row.order.id === openOrderId}
                        >
                          <SeverityCell tier={tier} title={SEVERITY_LABEL[tier]}>
                            <button
                              type="button"
                              onClick={() => openOrder(row.order.id)}
                              aria-label={`Open order ${formatOrderRef(row.order.id)}`}
                              className="rounded-card font-mono text-[12px] font-medium text-accent underline underline-offset-2 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                              {formatOrderRef(row.order.id)}
                            </button>
                          </SeverityCell>
                          <DataTableCell className="max-w-[170px] text-ink">
                            <span className="flex items-center gap-2">
                              <Thumb
                                src={kitchen?.image_url}
                                name={kitchenName}
                                size={THUMB_PX}
                              />
                              <span className="truncate">{kitchenName}</span>
                            </span>
                          </DataTableCell>
                          <DataTableCell className="max-w-[210px] text-ink-2">
                            <span className="block truncate">
                              {row.delivery.partner.name}
                            </span>
                            <span className="block font-mono text-[11px] text-ink-3">
                              {row.delivery.partner.phone} ·{" "}
                              {humanizeEnum(row.delivery.partner.vehicle_type)}
                            </span>
                          </DataTableCell>
                          <DataTableCell>
                            <Badge tone={STATUS_TONE[row.delivery.status]}>
                              {humanizeEnum(row.delivery.status)}
                            </Badge>
                          </DataTableCell>
                          <DataTableCell mono>
                            {formatClock(row.delivery.assigned_at)}
                          </DataTableCell>
                          <DataTableCell numeric>
                            {row.delivery.distance_km} km ·{" "}
                            {formatDuration(row.delivery.eta_minutes)}
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
                            {formatMoney(row.order.total_amount)}
                          </DataTableCell>
                          <DataTableCell numeric>
                            <RowActions>
                              <RowAction
                                tone="accent"
                                disabled={isFinished}
                                onClick={() =>
                                  setActing({ row, action: "reassign" })
                                }
                                title={
                                  isFinished
                                    ? "This order was handed over. There is nothing to reassign."
                                    : "Hand the ride to another rider."
                                }
                                ariaLabel={`Reassign the rider on order ${formatOrderRef(row.order.id)}`}
                              >
                                Reassign rider
                              </RowAction>
                              <RowAction
                                tone="danger"
                                disabled={isFinished || row.delivery.status === "failed"}
                                onClick={() => setActing({ row, action: "fail" })}
                                title={
                                  isFinished
                                    ? "A delivered ride cannot be marked failed."
                                    : row.delivery.status === "failed"
                                      ? "Already recorded as failed."
                                      : "Give up on this ride, with a reason."
                                }
                                ariaLabel={`Mark order ${formatOrderRef(row.order.id)} failed`}
                              >
                                Mark failed…
                              </RowAction>
                            </RowActions>
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

      <DeliveryActionDialog
        row={acting?.row ?? null}
        action={acting?.action ?? "reassign"}
        onClose={() => setActing(null)}
      />
      <OrderDrawer orderId={openOrderId} onClose={() => closeOrder()} />
    </div>
  );
}
