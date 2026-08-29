"use client";

import * as React from "react";
import {
  AutoScaleChart,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  getOrderStatusTone,
  Stat,
  StatRail,
  StatusChip,
  TableFooter,
  type AutoChartPoint,
} from "@repo/ui";
import { BoardSkeleton, RailSkeleton } from "../board-skeleton";
import { MiniMeter } from "../mini-meter";
import { QueryState } from "../query-state";
import {
  formatCount,
  formatDuration,
  formatMoney,
  formatRate,
} from "../../lib/format";
import { DECK_PANEL, DECK_RAIL } from "../../lib/deck";
import { useOrderReport } from "../../lib/queries";

const CHART_HEIGHT = 168;

/** "18:00", from the hour bucket. Local time, like every clock in the console. */
function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/**
 * Where orders end up, and when they arrive.
 *
 * The hour chart is the half that changes decisions: two peaks four hours apart
 * is a staffing question, and a flat line is a different platform. It is drawn
 * over every hour including the empty ones, because a chart that skipped 04:00
 * would hide the shape of a night shift rather than showing it as quiet.
 *
 * The two cancellation figures are kept apart on purpose. Inside the free window
 * costs nobody anything; after it, the customer was charged a fee and is the one
 * who rings support about it.
 */
export function OrderReport({ days }: { readonly days: number }): React.JSX.Element {
  const report = useOrderReport(days);

  return (
    <QueryState
      query={report}
      errorTitle="The order report could not load"
      emptyTitle="No orders in this window"
      emptyDetail="Widen the range and the split across the seven states appears here."
      isEmpty={(data) => data.orders === 0}
      skeleton={
        <>
          <RailSkeleton label="Counting where orders ended up" />
          <BoardSkeleton
            rows={7}
            label="Loading the order report"
            note="Splitting every order by state…"
          />
        </>
      }
    >
      {(data) => {
        const points: AutoChartPoint[] = data.hours.map((row) => ({
          label: hourLabel(row.hour),
          value: row.orders,
        }));
        const peak = data.hours.reduce(
          (best, row) => (row.orders > best.orders ? row : best),
          data.hours[0] ?? { hour: 0, orders: 0 },
        );
        const delivered =
          data.statuses.find((row) => row.status === "delivered")?.orders ?? 0;
        const cancelled = data.cancelled_inside_window + data.cancelled_outside_window;
        const lateShare = delivered === 0 ? 0 : data.delivered_late / delivered;

        return (
          <>
            <div className={DECK_RAIL}>
              <StatRail ariaLabel="Orders over the window">
                <Stat
                  label="Orders"
                  value={formatCount(data.orders)}
                  caption={`Over ${formatCount(data.days)} days`}
                  hint="Every order placed inside the window, in any state."
                />
                <Stat
                  label="Arrived late"
                  value={formatCount(data.delivered_late)}
                  tone={lateShare > 0.2 ? "alarm" : lateShare > 0.1 ? "warn" : "ok"}
                  caption={`${formatRate(lateShare, 1)} of everything delivered`}
                  hint="Delivered after the time the customer was promised. The verdict is fixed at handover — unlike the live board, nothing here is still counting."
                />
                <Stat
                  label="Typical journey"
                  value={
                    data.avg_minutes_to_deliver === null
                      ? "—"
                      : formatDuration(data.avg_minutes_to_deliver)
                  }
                  caption="Placed to handed over"
                  hint="The average across every delivered order in the window: the kitchen's prep, the wait for a rider, and the ride."
                />
                <Stat
                  label="Cancelled free"
                  value={formatCount(data.cancelled_inside_window)}
                  caption={
                    cancelled === 0
                      ? "Nothing was cancelled"
                      : `${formatRate(data.cancelled_inside_window / cancelled, 0)} of cancellations`
                  }
                  hint="Cancelled inside the free window, so the customer paid nothing. These are ordinary and cost the platform only the kitchen's time."
                />
                <Stat
                  label="Cancelled for a fee"
                  value={formatCount(data.cancelled_outside_window)}
                  tone={data.cancelled_outside_window > 0 ? "warn" : "default"}
                  caption="After the free window closed"
                  hint="The customer was charged for cancelling. This is the number support hears about."
                />
              </StatRail>
            </div>

            <Card className="shrink-0">
              <CardHeader className="items-center py-2">
                <CardTitle>Orders placed, by hour of the day</CardTitle>
                <span className="font-sans text-[12px] text-ink-3">
                  Busiest at {hourLabel(peak.hour)}
                </span>
              </CardHeader>
              <CardBody className="py-3">
                <AutoScaleChart
                  points={points}
                  height={CHART_HEIGHT}
                  tone="accent"
                  formatValue={(value) => formatCount(Math.round(value))}
                  ariaLabel="Orders placed by hour of the day"
                  caption={`${formatCount(data.orders)} orders over ${formatCount(data.days)} days · ${formatCount(peak.orders)} of them placed at ${hourLabel(peak.hour)}`}
                  emptyCaption="No orders were placed at any hour in this window."
                />
              </CardBody>
            </Card>

            <DataTableScroll
              className={DECK_PANEL}
              footer={
                <TableFooter
                  shown={data.statuses.length}
                  total={data.statuses.length}
                  noun="states"
                  sortedBy="the order's own lifecycle"
                  extra={`${formatCount(data.orders)} orders in the window`}
                />
              }
            >
              <DataTable aria-label="Orders by state over the window">
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="pl-4">State</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Orders</DataTableHeaderCell>
                    <DataTableHeaderCell className="w-[260px]">
                      Share of the window
                    </DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Value</DataTableHeaderCell>
                    <DataTableHeaderCell>What it means</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {data.statuses.map((row) => (
                    <DataTableRow key={row.status}>
                      <DataTableCell className="pl-4">
                        <StatusChip status={row.status} />
                      </DataTableCell>
                      <DataTableCell numeric>{formatCount(row.orders)}</DataTableCell>
                      <DataTableCell>
                        <MiniMeter
                          ariaLabel={`Share of orders in ${row.status}`}
                          value={row.orders}
                          max={data.orders}
                          valueLabel={formatRate(row.share, 1)}
                          tone={getOrderStatusTone(row.status)}
                        />
                      </DataTableCell>
                      <DataTableCell numeric>{formatMoney(row.gross)}</DataTableCell>
                      <DataTableCell className="text-ink-3">
                        {MEANING[row.status] ?? ""}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </DataTableScroll>
          </>
        );
      }}
    </QueryState>
  );
}

/**
 * One line per state, saying what it costs rather than what it is called.
 *
 * "Pending" tells the reader nothing they cannot see in the chip beside it; "the
 * kitchen has not accepted it yet" tells them whose problem it is.
 */
const MEANING: Readonly<Record<string, string>> = {
  pending: "Placed, and the kitchen has not accepted it yet.",
  confirmed: "Accepted. The clock on the customer's promise is running.",
  preparing: "Being cooked. Nothing can be changed after this.",
  ready_for_pickup: "Cooked and waiting for a rider. Food goes cold here.",
  out_for_delivery: "On the road. Only the rider can move it now.",
  delivered: "Reached the customer. The only state that earns anything.",
  cancelled: "Earned nothing, and often cost a refund on top.",
};
