"use client";

import * as React from "react";
import Link from "next/link";
import {
  AutoScaleChart,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  cn,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  LiveDot,
  PageTitle,
  SegmentedControl,
  SEVERITY_LABEL,
  SEVERITY_TEXT,
  SeverityCell,
  Skeleton,
  Stat,
  StatRail,
  TableFooter,
  Thumb,
  type AutoChartPoint,
} from "@repo/ui";
import { BoardSkeleton, RailSkeleton } from "../../components/board-skeleton";
import { PipelineBoard } from "../../components/pipeline-board";
import { PlatformHealth } from "../../components/platform-health";
import { QueryState } from "../../components/query-state";
import { WidenWindow } from "../../components/widen-window";
import {
  formatCount,
  formatDay,
  formatDuration,
  formatMoneyWhole,
  formatRate,
  toNumber,
} from "../../lib/format";
import { DECK_RAIL } from "../../lib/deck";
import {
  bySlippingFirst,
  divergenceTier,
  formatAboveTypical,
  gapMinutes,
  gapScale,
} from "../../lib/kitchen-gap";
import {
  LIVE_REFETCH_MS,
  useFunnel,
  useLiveOrders,
  useOrderReport,
  useOrdersOverTime,
  useRestaurantDirectory,
  useRestaurantMetrics,
  useSummary,
  useWorkload,
} from "../../lib/queries";
import { tallyLate } from "../../lib/sla";
import { median } from "../../lib/stats";
import { useNow } from "../../lib/use-now";

type Series = "orders" | "revenue";
type RangeDays = "7" | "30" | "90";

const SERIES_OPTIONS = [
  { value: "orders" as const, label: "Orders" },
  { value: "revenue" as const, label: "Revenue" },
];

const RANGE_OPTIONS = [
  { value: "7" as const, label: "7 days" },
  { value: "30" as const, label: "30 days" },
  { value: "90" as const, label: "90 days" },
];

/**
 * Plot height, measured on the rendered page at 1440×900.
 *
 * The trend is context, not the work. It gets a band the eye can read in one
 * glance and the rest of the deck goes to the kitchens table underneath — a
 * chart stretched to 500px so the page "fills the fold" is the band of dead
 * space with a line drawn through it.
 */
const CHART_HEIGHT = 196;

/** The cover beside a kitchen's name, sized for a 38px row. */
const COVER_PX = 22;

/**
 * The page root. Deliberately NOT `DECK_PAGE`.
 *
 * Overview is a stack of five bands — pipeline, rail, chart, health, kitchens —
 * and on a fixed-height deck the kitchens table was the band that gave way: 75px
 * at 1440×900 (one row of eight) and 0px at 1366×768 (OP-1). There is no height
 * at which all five fit a laptop, so this page is a document: every band keeps
 * its content height and `<main>` scrolls.
 */
const OVERVIEW_PAGE = "flex flex-col gap-3";

/** The window the health panel describes. Long enough to have a shape. */
const HEALTH_WINDOW_DAYS = 30;

export default function OverviewPage(): React.JSX.Element {
  const [series, setSeries] = React.useState<Series>("orders");
  const [rangeDays, setRangeDays] = React.useState<RangeDays>("30");

  const summary = useSummary();
  const workload = useWorkload();
  // The funnel's per-status counts. For a status an order can only sit in while
  // it is in flight, that count IS the live count — nothing all-time about it.
  const funnel = useFunnel();
  const health = useOrderReport(HEALTH_WINDOW_DAYS);
  const overTime = useOrdersOverTime(Number.parseInt(rangeDays, 10));
  const kitchens = useRestaurantMetrics();
  const directory = useRestaurantDirectory();

  const breached = summary.data?.breached_refunds ?? 0;
  // The same cached query the live board and the nav read; see lib/sla.ts.
  const liveOrders = useLiveOrders();
  const nowMs = useNow();
  // Late and stuck split from the rows, not `workload.orders_late`: the
  // server's figure counts stuck orders as late, and the red "36 past
  // promised" it produced sat over a live board with nothing late on it.
  const liveTally =
    nowMs === null || liveOrders.data === undefined
      ? undefined
      : tallyLate(liveOrders.data.items, nowMs);

  return (
    <div className={OVERVIEW_PAGE}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle subtitle="Every restaurant, counted together.">
          Overview
        </PageTitle>
        <LiveDot
          interval={LIVE_REFETCH_MS / 1000}
          at={summary.dataUpdatedAt === 0 ? null : summary.dataUpdatedAt}
          paused={summary.isError}
        />
      </div>

      {/* The live pipeline first, because it is the only thing on this page
          somebody acts on in the next ten minutes. Everything below it is how
          the day and the month have gone. */}
      <PipelineBoard
        statuses={funnel.data?.statuses}
        confirmed={
          funnel.data?.statuses.find((row) => row.status === "confirmed")
            ?.order_count
        }
        late={liveTally?.late}
        stuck={liveTally?.stuck}
      />

      <QueryState
        query={summary}
        errorTitle="Today's numbers could not load"
        emptyTitle="No platform metrics yet"
        emptyDetail="Once the first order is placed, orders, revenue and live counts appear here."
        skeleton={
          <div className={DECK_RAIL}>
            <RailSkeleton label="Loading today's numbers" cells={6} />
          </div>
        }
      >
        {(data) => (
          <div className={cn(DECK_RAIL, "flex flex-col gap-1.5")}>
            {/* One rail, six cells, read left to right as now -> today -> all
                time. It was twelve across two bands, which is the wall of
                numbers DENSITY.md §1 exists to prevent: two of the twelve were
                both called some kind of "revenue", three were the same split
                counted twice, and four were roster figures that never change
                during a shift. Those four moved to the quiet line underneath —
                still on screen, no longer competing with the work. */}
            <StatRail ariaLabel="Money, and the one alarm">
              <Stat
                label="Revenue today"
                value={formatMoneyWhole(data.revenue_today)}
                caption={`${formatCount(data.orders_today)} orders placed today`}
                hint="Delivered money from orders placed since midnight. Attributed by when the order was placed, so it describes the same set as the count beside it."
              />
              <Stat
                label="Revenue"
                value={formatMoneyWhole(data.gross_revenue)}
                caption={`${formatMoneyWhole(data.commission_revenue)} kept as commission`}
                hint="The full value of every delivered order, all time, before Foodishi's cut. The caption is that cut — charged per kitchen at its own rate, so it is a sum rather than one percentage of the figure beside it."
              />
              <Stat
                label="Average order"
                value={formatMoneyWhole(data.avg_order_value)}
                caption={`${formatCount(data.delivered_orders)} delivered of ${formatCount(data.total_orders)}`}
                hint="Delivered revenue divided by delivered orders. The denominator excludes cancelled and in-flight orders, which is why it is not total revenue over total orders."
              />
              <Stat
                label="Breached refund SLAs"
                value={formatCount(data.breached_refunds)}
                tone={data.breached_refunds > 0 ? "alarm" : "ok"}
                caption={
                  data.breached_refunds > 0
                    ? "Work them under Refunds"
                    : "Every refund inside its SLA"
                }
                hint={
                  data.breached_refunds > 0
                    ? "These refunds are past the time the customer was promised their money back and have still not completed."
                    : "No refund is past the time the customer was promised their money back."
                }
              />
            </StatRail>

            {/* The roster. Facts about the platform rather than about tonight,
                so they are a sentence and not six more cells. */}
            <p className="font-sans text-[12px] text-ink-3">
              <span className="font-medium text-ink-2">
                {formatCount(data.active_restaurants)}
              </span>{" "}
              active kitchens ·{" "}
              <span className="font-medium text-ink-2">
                {formatCount(data.total_users)}
              </span>{" "}
              registered accounts ·{" "}
              <span className="font-medium text-ink-2">
                {formatCount(data.active_customers)}
              </span>{" "}
              ordered in the last{" "}
              {formatCount(data.active_customer_window_days)} days ·{" "}
              <span className="font-medium text-ink-2">
                {formatCount(data.cancelled_orders)}
              </span>{" "}
              orders cancelled all time
              {data.total_orders === 0
                ? null
                : ` (${formatRate(data.cancelled_orders / data.total_orders, 1)})`}
            </p>
          </div>
        )}
      </QueryState>

      {/* Two columns rather than two bands. A revenue line tells you the shape
          of the month and nothing about whether the month went well; the panel
          beside it is the half that answers that, and reading them together is
          the whole point of putting them on one row. */}
      <div className="grid shrink-0 items-start gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card className="shrink-0">
          <CardHeader className="flex-wrap items-center gap-2 py-2">
            <CardTitle>
              {series === "orders" ? "Orders placed" : "Revenue delivered"} per
              day
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                ariaLabel="Chart series"
                options={SERIES_OPTIONS}
                value={series}
                onValueChange={setSeries}
              />
              <SegmentedControl
                ariaLabel="Chart window"
                options={RANGE_OPTIONS}
                value={rangeDays}
                onValueChange={setRangeDays}
              />
            </div>
          </CardHeader>
          <CardBody className="py-3">
            <QueryState
              query={overTime}
              errorTitle="The daily chart could not load"
              emptyTitle={`No orders in the last ${rangeDays} days`}
              emptyDetail="Each day with at least one order becomes a point on this chart."
              emptyAction={
                <WidenWindow
                  days={Number.parseInt(rangeDays, 10)}
                  onWiden={() => setRangeDays("90")}
                />
              }
              isEmpty={(data) => data.length === 0}
              skeleton={
                <Skeleton
                  className="w-full"
                  style={{ height: CHART_HEIGHT }}
                  label="Loading the daily chart"
                />
              }
            >
              {(data) => {
                const points: AutoChartPoint[] = data.map((point) => ({
                  label: formatDay(point.date),
                  value:
                    series === "orders"
                      ? point.order_count
                      : toNumber(point.revenue),
                }));
                const total = points.reduce((sum, point) => sum + point.value, 0);
                const busiest = points.reduce(
                  (best, point) => (point.value > best.value ? point : best),
                  points[0] ?? { label: "", value: 0 },
                );
                const typical = median(points.map((point) => point.value));

                return (
                  <AutoScaleChart
                    points={points}
                    height={CHART_HEIGHT}
                    tone={series === "orders" ? "accent" : "ok"}
                    formatValue={
                      series === "orders"
                        ? (value) => formatCount(Math.round(value))
                        : formatMoneyWhole
                    }
                    ariaLabel={
                      series === "orders"
                        ? `Orders placed per day over the last ${rangeDays} days`
                        : `Revenue delivered per day over the last ${rangeDays} days`
                    }
                    caption={
                      series === "orders"
                        ? `${formatCount(total)} orders over ${formatCount(points.length)} days · a typical day brings ${formatCount(Math.round(typical))} · ${busiest.label} alone brought ${formatCount(busiest.value)}`
                        : `${formatMoneyWhole(total)} delivered over ${formatCount(points.length)} days · a typical day takes ${formatMoneyWhole(typical)} · best was ${busiest.label}`
                    }
                    emptyCaption={`No ${series === "orders" ? "orders" : "delivered revenue"} at all in the last ${rangeDays} days.`}
                  />
                );
              }}
            </QueryState>
          </CardBody>
        </Card>

        <PlatformHealth
          report={health.data}
          workload={workload.data}
          breachedRefunds={summary.data?.breached_refunds}
          days={HEALTH_WINDOW_DAYS}
        />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-sans text-[13px] font-semibold text-ink">
          Kitchens furthest above the typical overhead
        </h2>
        {breached > 0 ? (
          <p className="font-sans text-[12px] text-ink-3">
            <Link
              href="/sla"
              className="font-medium text-accent underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Open Refunds
            </Link>{" "}
            to see which {formatCount(breached)} refunds are past due and by how
            long.
          </p>
        ) : null}
      </div>

      <QueryState
        query={kitchens}
        errorTitle="Kitchen performance could not load"
        emptyTitle="No kitchen has taken an order yet"
        emptyDetail="Each restaurant appears here once its first order has been delivered, measured against the platform's typical overhead."
        isEmpty={(page) => page.items.length === 0}
        skeleton={
          <BoardSkeleton
            rows={5}
            label="Loading kitchen performance"
            note="Comparing every kitchen against the typical overhead…"
          />
        }
      >
        {(page) => {
          const scale = gapScale(page.items);
          const rows = [...page.items].sort(bySlippingFirst);
          const flagged = rows.filter(
            (row) => divergenceTier(gapMinutes(row), scale) > 0,
          ).length;

          return (
            <DataTableScroll
              footer={
                <TableFooter
                  shown={rows.length}
                  total={page.total}
                  noun="kitchens"
                  sortedBy="how far above the typical overhead each kitchen sits"
                  extra={
                    flagged > 0
                      ? `${formatCount(flagged)} more than ${formatDuration(scale.warnAt - scale.medianGap)} above the typical ${formatDuration(scale.medianGap)}`
                      : `every kitchen is near the typical ${formatDuration(scale.medianGap)}`
                  }
                />
              }
            >
              <DataTable aria-label="Kitchens, furthest above the typical overhead first">
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="pl-4">
                      Kitchen
                    </DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Orders</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>
                      Declared prep
                    </DataTableHeaderCell>
                    <DataTableHeaderCell numeric>
                      Really takes
                    </DataTableHeaderCell>
                    <DataTableHeaderCell numeric>
                      Above typical
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {rows.map((row) => {
                    const gap = gapMinutes(row);
                    const tier = divergenceTier(gap, scale);

                    return (
                      <DataTableRow key={row.restaurant_id}>
                        <SeverityCell
                          tier={tier}
                          title={tier === 0 ? undefined : SEVERITY_LABEL[tier]}
                          className="max-w-[280px] font-medium text-ink"
                        >
                          <span className="flex items-center gap-2">
                            <Thumb
                              src={
                                directory.data?.get(row.restaurant_id)
                                  ?.image_url
                              }
                              name={row.name}
                              size={COVER_PX}
                            />
                            <span className="truncate">{row.name}</span>
                          </span>
                        </SeverityCell>
                        <DataTableCell numeric>
                          {formatCount(row.order_count)}
                        </DataTableCell>
                        <DataTableCell numeric>
                          {formatDuration(row.avg_prep_minutes)}
                        </DataTableCell>
                        <DataTableCell numeric>
                          {row.avg_delivery_minutes === null ? (
                            <span className="text-ink-3">
                              no deliveries yet
                            </span>
                          ) : (
                            formatDuration(row.avg_delivery_minutes)
                          )}
                        </DataTableCell>
                        <DataTableCell numeric>
                          {gap === null ? (
                            <span className="text-ink-4">—</span>
                          ) : (
                            <span
                              className={
                                tier === 0 ? "text-ink-2" : SEVERITY_TEXT[tier]
                              }
                            >
                              {formatAboveTypical(gap, scale)}
                            </span>
                          )}
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })}
                </DataTableBody>
              </DataTable>
            </DataTableScroll>
          );
        }}
      </QueryState>
    </div>
  );
}
