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
  PageTitle,
  SegmentedControl,
  Stat,
  StatRail,
  TableFooter,
  UsageBar,
  type AutoChartPoint,
} from "@repo/ui";
import { PopularItemsTable } from "./popular-items";
import { KitchenGate } from "../_components/kitchen-gate";
import { CardSkeletons, EmptyCard, LoadError } from "../_components/states";
import {
  formatCount,
  formatDay,
  formatDayWithWeekday,
  formatMoney,
  formatMoneyRound,
  formatPercent,
  pluralise,
} from "../_lib/format";
import { RANGE_OPTIONS, daysIn, describeRange, windowFor, type RangeKey } from "../_lib/windows";
import { usePerformance, useSalesReport } from "../../lib/queries/reports";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { SalesDay } from "../../lib/types";

function toPoints(days: readonly SalesDay[]): readonly AutoChartPoint[] {
  return days.map((day) => ({ label: formatDay(day.date), value: Number(day.revenue) }));
}

function sumBy(days: readonly SalesDay[], read: (day: SalesDay) => number): number {
  return days.reduce((total, day) => total + read(day), 0);
}

/**
 * Sales, orders and how well the kitchen kept its promises.
 *
 * Every revenue figure on this screen counts DELIVERED orders only, and every
 * caption says so. That is not pedantry: a restaurant reading "₹52,000" and
 * finding ₹6,000 of it was cancelled has been told something false, and it is
 * the one number they will take to an argument about a settlement.
 *
 * The day table is the whole window, not a page of it. Thirty rows is a scroll,
 * not a pagination, and a manager comparing Friday to Saturday should not have
 * to find them on different pages.
 */
function Reports({ kitchen }: { readonly kitchen: ReadyKitchen }): React.JSX.Element {
  const now = React.useMemo(() => Date.now(), []);
  const [range, setRange] = React.useState<RangeKey>("7d");

  const window = React.useMemo(() => windowFor(range, now), [range, now]);
  const sales = useSalesReport(kitchen, window);
  const performance = usePerformance(kitchen, window);

  const days = sales.data ?? [];
  const revenue = sumBy(days, (day) => Number(day.revenue));
  const discount = sumBy(days, (day) => Number(day.discount));
  const orders = sumBy(days, (day) => day.orders);
  const delivered = sumBy(days, (day) => day.delivered);
  const cancelled = sumBy(days, (day) => day.cancelled);
  const best = days.reduce<SalesDay | null>(
    (top, day) => (top === null || Number(day.revenue) > Number(top.revenue) ? day : top),
    null,
  );

  return (
    <div className="flex flex-col gap-5">
      <SegmentedControl
        ariaLabel="Period"
        options={RANGE_OPTIONS}
        value={range}
        onValueChange={setRange}
      />

      {sales.isPending || performance.isPending ? (
        <CardSkeletons count={3} label="Adding up the period" />
      ) : null}

      {sales.error !== null ? (
        <LoadError
          error={sales.error}
          title="Could not add up sales"
          refusedTitle="Reports are not on the live API yet"
          onRetry={() => {
            void sales.refetch();
          }}
        />
      ) : null}

      {sales.data !== undefined && performance.data !== undefined ? (
        <>
          <StatRail ariaLabel={`Trade over ${describeRange(range).toLowerCase()}`}>
            <Stat
              label="Revenue"
              value={formatMoneyRound(revenue)}
              caption={`${pluralise(delivered, "delivered order", "delivered orders")}`}
              hint="Delivered orders only, at their full total including delivery. Cancelled trade is not revenue."
            />
            <Stat
              label="Orders"
              value={formatCount(orders)}
              caption={`${formatCount(delivered)} delivered · ${formatCount(cancelled)} cancelled`}
              hint="Every order placed in the period, however it ended."
            />
            <Stat
              label="Average order"
              value={delivered === 0 ? "—" : formatMoney(performance.data.avg_order_value)}
              caption={delivered === 0 ? "Nothing delivered yet" : "Across delivered orders"}
              hint="Revenue divided by the number of delivered orders."
            />
            <Stat
              label="Per day"
              value={formatMoneyRound(revenue / daysIn(range))}
              caption={`Over ${pluralise(daysIn(range), "day", "days")}`}
              hint="Revenue divided by the number of days in the period, including days with no trade."
            />
            <Stat
              label="Discounts given"
              value={formatMoneyRound(discount)}
              tone={revenue > 0 && discount / revenue > 0.2 ? "warn" : "default"}
              caption={
                revenue === 0
                  ? "No trade yet"
                  : `${formatPercent(discount / (revenue + discount))} of what was charged`
              }
              hint="What offers and coupons took off delivered orders. This comes out of the restaurant's margin, not the platform's."
            />
          </StatRail>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by day</CardTitle>
              {best !== null && Number(best.revenue) > 0 ? (
                <span className="font-mono text-[13px] tabular-nums text-ink-3">
                  best {formatDay(best.date)} · {formatMoneyRound(best.revenue)}
                </span>
              ) : null}
            </CardHeader>
            <CardBody>
              <AutoScaleChart
                points={toPoints(days)}
                ariaLabel="Delivered revenue per day"
                formatValue={(value) => formatMoneyRound(value)}
                caption="Delivered orders only. The peak is labelled with its own day."
                emptyCaption="Nothing was delivered in this period, so there is no revenue to plot."
              />
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>How the kitchen performed</CardTitle>
                <span className="text-[13px] text-ink-3">{describeRange(range)}</span>
              </CardHeader>
              <CardBody className="flex flex-col gap-4">
                <UsageBar
                  label="Delivered on or before the promised time"
                  value={Math.round(performance.data.on_time_rate * 100)}
                  max={100}
                  valueLabel={
                    performance.data.delivered === 0
                      ? "nothing delivered"
                      : formatPercent(performance.data.on_time_rate)
                  }
                  tone={performance.data.on_time_rate < 0.8 ? "warn" : "ok"}
                />
                <UsageBar
                  label="Orders the restaurant turned away or dropped"
                  value={performance.data.cancelled}
                  max={Math.max(1, performance.data.orders)}
                  valueLabel={`${formatCount(performance.data.cancelled)} of ${formatCount(performance.data.orders)}`}
                  tone={
                    performance.data.orders > 0 &&
                    performance.data.cancelled / performance.data.orders > 0.1
                      ? "crit"
                      : "mute"
                  }
                />
                <dl className="flex flex-col gap-2 text-[14px]">
                  <div className="flex justify-between gap-3 border-b border-line pb-1.5">
                    <dt className="text-ink-3">Placed to ready, average</dt>
                    <dd className="font-mono tabular-nums text-ink">
                      {performance.data.avg_prep_minutes === 0
                        ? "—"
                        : `${performance.data.avg_prep_minutes} min`}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-line pb-1.5">
                    <dt className="text-ink-3">Placed to delivered, average</dt>
                    <dd className="font-mono tabular-nums text-ink">
                      {performance.data.avg_delivery_minutes === 0
                        ? "—"
                        : `${performance.data.avg_delivery_minutes} min`}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-line pb-1.5">
                    <dt className="text-ink-3">Rejected before accepting</dt>
                    <dd className="font-mono tabular-nums text-ink">
                      {formatCount(performance.data.rejected)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-3">Customer rating</dt>
                    <dd className="font-mono tabular-nums text-ink">
                      {performance.data.rating}{" "}
                      <span className="text-ink-3">
                        from {formatCount(performance.data.rating_count)}
                      </span>
                    </dd>
                  </div>
                </dl>
                <p className="text-[12px] leading-snug text-ink-3">
                  A cancellation and a rejection both end as cancelled, and the
                  difference is whether the kitchen had already accepted. Rejecting
                  is a busy kitchen; cancelling is a broken promise.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Day by day</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                {days.length === 0 ? (
                  <EmptyCard
                    title="No days in this period"
                    detail="Widen the period above."
                  />
                ) : (
                  <DataTableScroll
                    footer={
                      <TableFooter
                        shown={days.length}
                        total={days.length}
                        noun="days"
                        sortedBy="oldest first"
                        extra={`${formatMoneyRound(revenue)} in total`}
                      />
                    }
                  >
                    <DataTable>
                      <DataTableHead>
                        <DataTableRow>
                          <DataTableHeaderCell>Day</DataTableHeaderCell>
                          <DataTableHeaderCell numeric>Orders</DataTableHeaderCell>
                          <DataTableHeaderCell numeric>Delivered</DataTableHeaderCell>
                          <DataTableHeaderCell numeric>Cancelled</DataTableHeaderCell>
                          <DataTableHeaderCell numeric>Revenue</DataTableHeaderCell>
                        </DataTableRow>
                      </DataTableHead>
                      <DataTableBody>
                        {days.map((day) => (
                          <DataTableRow key={day.date}>
                            <DataTableCell className="whitespace-nowrap text-ink-2">
                              {formatDayWithWeekday(day.date)}
                            </DataTableCell>
                            <DataTableCell numeric mono className="text-ink-2">
                              {formatCount(day.orders)}
                            </DataTableCell>
                            <DataTableCell numeric mono className="text-ink-2">
                              {formatCount(day.delivered)}
                            </DataTableCell>
                            <DataTableCell
                              numeric
                              mono
                              className={day.cancelled > 0 ? "text-crit" : "text-ink-4"}
                            >
                              {formatCount(day.cancelled)}
                            </DataTableCell>
                            <DataTableCell numeric mono className="text-ink">
                              {formatMoney(day.revenue)}
                            </DataTableCell>
                          </DataTableRow>
                        ))}
                      </DataTableBody>
                    </DataTable>
                  </DataTableScroll>
                )}
              </CardBody>
            </Card>
          </div>

          <PopularItemsTable kitchen={kitchen} window={window} range={range} />
        </>
      ) : null}

      {performance.error !== null && sales.error === null ? (
        <LoadError
          error={performance.error}
          title="Could not measure performance"
          onRetry={() => {
            void performance.refetch();
          }}
        />
      ) : null}
    </div>
  );
}

export default function ReportsPage(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle subtitle="What was sold, what it earned, and how well the promises were kept. Revenue counts delivered orders only, everywhere.">
        Reports
      </PageTitle>

      <KitchenGate loadingCards={3} loadingLabel="Adding up" requires="reports.view">
        {(kitchen) => <Reports kitchen={kitchen} />}
      </KitchenGate>
    </div>
  );
}
