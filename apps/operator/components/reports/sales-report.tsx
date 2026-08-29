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
  SegmentedControl,
  Skeleton,
  Stat,
  StatRail,
  TableFooter,
  type AutoChartPoint,
} from "@repo/ui";
import { BoardSkeleton, RailSkeleton } from "../board-skeleton";
import { QueryState } from "../query-state";
import {
  formatCount,
  formatDay,
  formatMoney,
  formatMoneyWhole,
  toNumber,
} from "../../lib/format";
import { DECK_PANEL, DECK_RAIL } from "../../lib/deck";
import { useSalesReport } from "../../lib/queries";

/** Measured on the rendered page at 1440×900: context, not the work. */
const CHART_HEIGHT = 176;

type Series = "gross" | "orders" | "commission";

const SERIES_OPTIONS = [
  { value: "gross" as const, label: "Revenue" },
  { value: "orders" as const, label: "Orders" },
  { value: "commission" as const, label: "Commission" },
];

/**
 * How much came in, day by day.
 *
 * Revenue counts delivered orders only and is attributed to the day the order
 * was *placed*, not the day it was handed over — so the money on a row always
 * lines up with the order count beside it. An order placed at 23:50 and
 * delivered at 00:20 belongs to the evening somebody worked, not to the morning
 * after.
 */
export function SalesReport({ days }: { readonly days: number }): React.JSX.Element {
  const report = useSalesReport(days);
  const [series, setSeries] = React.useState<Series>("gross");

  return (
    <QueryState
      query={report}
      errorTitle="The sales report could not load"
      emptyTitle="No orders in this window"
      emptyDetail="Widen the range and each day with at least one order becomes a row."
      isEmpty={(data) => data.days.length === 0}
      skeleton={
        <>
          <RailSkeleton label="Adding up the sales" />
          <BoardSkeleton rows={10} label="Loading the sales report" note="Adding up each day…" />
        </>
      }
    >
      {(data) => {
        const points: AutoChartPoint[] = data.days.map((row) => ({
          label: formatDay(row.day),
          value:
            series === "orders"
              ? row.orders
              : toNumber(series === "gross" ? row.gross : row.commission),
        }));
        const deliveredShare =
          data.orders === 0 ? 0 : Math.round((data.delivered / data.orders) * 100);

        return (
          <>
            <div className={DECK_RAIL}>
              <StatRail ariaLabel="Sales over the window">
                <Stat
                  label="Orders"
                  value={formatCount(data.orders)}
                  caption={`${formatCount(data.days.length)} trading days`}
                  hint="Every order placed inside the window, in any state."
                />
                <Stat
                  label="Delivered"
                  value={formatCount(data.delivered)}
                  tone="ok"
                  caption={`${String(deliveredShare)}% of everything placed`}
                  hint="Orders that reached the customer. Only these earn revenue."
                />
                <Stat
                  label="Revenue"
                  value={formatMoneyWhole(data.gross)}
                  caption="Delivered, all in"
                  hint="What customers paid for delivered orders — food, packaging, delivery and tax."
                />
                <Stat
                  label="Commission"
                  value={formatMoneyWhole(data.commission)}
                  caption="What the platform kept"
                  hint="Foodishi's cut, charged on the food value of delivered orders at each kitchen's own rate."
                />
                <Stat
                  label="Average order"
                  value={formatMoneyWhole(data.avg_order_value)}
                  caption={
                    data.peak === null
                      ? "Per delivered order"
                      : `Busiest day ${formatDay(data.peak.day)}`
                  }
                  hint="Delivered revenue divided by delivered orders. Cancelled and in-flight orders are not in the denominator."
                />
              </StatRail>
            </div>

            <Card className="shrink-0">
              <CardHeader className="flex-wrap items-center gap-2 py-2">
                <CardTitle>
                  {series === "orders"
                    ? "Orders placed"
                    : series === "gross"
                      ? "Revenue delivered"
                      : "Commission earned"}{" "}
                  per day
                </CardTitle>
                <SegmentedControl
                  ariaLabel="Chart series"
                  options={SERIES_OPTIONS}
                  value={series}
                  onValueChange={setSeries}
                />
              </CardHeader>
              <CardBody className="py-3">
                {report.isPending ? (
                  <Skeleton
                    className="w-full"
                    style={{ height: CHART_HEIGHT }}
                    label="Loading the daily chart"
                  />
                ) : (
                  <AutoScaleChart
                    points={points}
                    height={CHART_HEIGHT}
                    tone={series === "orders" ? "accent" : "ok"}
                    formatValue={
                      series === "orders"
                        ? (value) => formatCount(Math.round(value))
                        : formatMoneyWhole
                    }
                    ariaLabel={`${series} per day over the last ${String(days)} days`}
                    caption={
                      series === "orders"
                        ? `${formatCount(data.orders)} orders over ${formatCount(data.days.length)} days`
                        : `${formatMoneyWhole(series === "gross" ? data.gross : data.commission)} over ${formatCount(data.days.length)} days`
                    }
                    emptyCaption="Nothing at all in this window."
                  />
                )}
              </CardBody>
            </Card>

            <DataTableScroll
              className={DECK_PANEL}
              footer={
                <TableFooter
                  shown={data.days.length}
                  total={data.days.length}
                  noun="days"
                  sortedBy="date, oldest first"
                  extra={`${formatMoneyWhole(data.gross)} delivered · ${formatCount(data.cancelled)} cancelled`}
                />
              }
            >
              <DataTable aria-label="Sales per day, oldest first">
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="pl-4">Day</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Orders</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Delivered</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Revenue</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Commission</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Average order</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {data.days.map((row) => (
                    <DataTableRow key={row.day}>
                      <DataTableCell className="pl-4" mono>
                        {formatDay(row.day)}
                      </DataTableCell>
                      <DataTableCell numeric>{formatCount(row.orders)}</DataTableCell>
                      <DataTableCell numeric>{formatCount(row.delivered)}</DataTableCell>
                      <DataTableCell numeric>{formatMoney(row.gross)}</DataTableCell>
                      <DataTableCell numeric>{formatMoney(row.commission)}</DataTableCell>
                      <DataTableCell numeric>
                        {row.delivered === 0 ? (
                          <span className="text-ink-4">—</span>
                        ) : (
                          formatMoney(row.avg_order_value)
                        )}
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
