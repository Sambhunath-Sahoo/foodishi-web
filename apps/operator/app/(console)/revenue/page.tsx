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
  PageTitle,
  SegmentedControl,
  Skeleton,
  Stat,
  StatRail,
  StatusChip,
  TableFooter,
  type AutoChartPoint,
} from "@repo/ui";
import { MiniMeter } from "../../../components/mini-meter";
import { QueryState } from "../../../components/query-state";
import {
  formatCount,
  formatDay,
  formatMoneyWhole,
  formatRate,
  toNumber,
} from "../../../lib/format";
import { useFunnel, useOrdersOverTime } from "../../../lib/queries";

/** Above this share of orders, cancellations stop being noise. */
const CANCELLATION_CONCERN_RATE = 0.1;

/** Tuned by measuring the rendered page at 1440×900. */
const CHART_HEIGHT = 224;

type RangeDays = "7" | "30" | "90";

const RANGE_OPTIONS = [
  { value: "7" as const, label: "7 days" },
  { value: "30" as const, label: "30 days" },
  { value: "90" as const, label: "90 days" },
];

function share(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}

export default function RevenuePage(): React.JSX.Element {
  const [rangeDays, setRangeDays] = React.useState<RangeDays>("30");
  const funnel = useFunnel();
  const overTime = useOrdersOverTime(Number.parseInt(rangeDays, 10));

  return (
    <div className="flex flex-col gap-3">
      <PageTitle subtitle="Where every order placed on the platform actually ends up.">
        Revenue &amp; funnel
      </PageTitle>

      <QueryState
        query={funnel}
        errorTitle="The funnel could not load"
        emptyTitle="No orders to break down yet"
        emptyDetail="Once orders are placed, their split across the seven states appears here."
        isEmpty={(data) => data.total_orders === 0}
        skeleton={<Skeleton className="h-[440px] w-full" label="Loading the funnel" />}
      >
        {(data) => {
          const delivered =
            data.statuses.find((row) => row.status === "delivered")?.order_count ?? 0;
          const conversion = share(delivered, data.total_orders);
          const inFlight = Math.max(
            0,
            data.total_orders - delivered - data.cancelled_orders,
          );
          const cancellationIsHigh =
            data.cancellation_rate >= CANCELLATION_CONCERN_RATE;
          const insideShare = share(
            data.cancelled_inside_window,
            data.cancelled_orders,
          );
          const outsideShare = share(
            data.cancelled_outside_window,
            data.cancelled_orders,
          );

          return (
            <>
              <StatRail ariaLabel="Order funnel">
                <Stat
                  label="Orders placed"
                  value={formatCount(data.total_orders)}
                  caption="Every order, all time"
                  hint="Every order ever placed on the platform, in any state."
                />
                <Stat
                  label="Delivered"
                  value={formatCount(delivered)}
                  tone="ok"
                  caption={`${formatRate(conversion, 1)} of everything placed`}
                  hint="Only delivered orders count toward revenue."
                />
                <Stat
                  label="Still in flight"
                  value={formatCount(inFlight)}
                  caption="Not yet delivered or cancelled"
                  hint="Orders somewhere between placed and handed over."
                />
                <Stat
                  label="Cancelled"
                  value={formatCount(data.cancelled_orders)}
                  tone={cancellationIsHigh ? "alarm" : "default"}
                  caption={`${formatRate(data.cancellation_rate, 1)} of all orders`}
                  hint="Cancelled orders earn nothing and often cost a refund on top."
                />
                <Stat
                  label="Charged a fee"
                  value={formatCount(data.cancelled_outside_window)}
                  tone={data.cancelled_outside_window > 0 ? "warn" : "default"}
                  caption="Cancelled after the free window"
                  hint="These are the customers support hears from: they cancelled late and were charged for it."
                />
              </StatRail>

              <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <Card>
                  <CardHeader className="items-center py-2">
                    <CardTitle>Revenue delivered per day</CardTitle>
                    <SegmentedControl
                      ariaLabel="Chart window"
                      options={RANGE_OPTIONS}
                      value={rangeDays}
                      onValueChange={setRangeDays}
                    />
                  </CardHeader>
                  <CardBody className="py-3">
                    <QueryState
                      query={overTime}
                      errorTitle="The daily revenue chart could not load"
                      emptyTitle={`No orders in the last ${rangeDays} days`}
                      emptyDetail="Each day with at least one delivered order becomes a point on this chart."
                      isEmpty={(rows) => rows.length === 0}
                      skeleton={
                        <Skeleton
                          className="w-full"
                          style={{ height: CHART_HEIGHT }}
                          label="Loading the daily revenue chart"
                        />
                      }
                    >
                      {(rows) => {
                        const points: AutoChartPoint[] = rows.map((point) => ({
                          label: formatDay(point.date),
                          value: toNumber(point.revenue),
                        }));
                        const total = points.reduce(
                          (sum, point) => sum + point.value,
                          0,
                        );

                        return (
                          <AutoScaleChart
                            points={points}
                            tone="ok"
                            height={CHART_HEIGHT}
                            formatValue={formatMoneyWhole}
                            ariaLabel={`Revenue delivered per day over the last ${rangeDays} days`}
                            caption={`${formatMoneyWhole(total)} delivered over the last ${rangeDays} days`}
                            emptyCaption={`Nothing was delivered in the last ${rangeDays} days.`}
                          />
                        );
                      }}
                    </QueryState>
                  </CardBody>
                </Card>

                <DataTableScroll
                  footer={
                    <TableFooter
                      shown={data.statuses.length}
                      total={data.statuses.length}
                      noun="states"
                      sortedBy="the order's own lifecycle"
                      extra={`${formatCount(data.total_orders)} orders in total`}
                    />
                  }
                >
                  <DataTable aria-label="Orders by state">
                    <DataTableHead>
                      <tr>
                        <DataTableHeaderCell className="pl-4">State</DataTableHeaderCell>
                        <DataTableHeaderCell numeric>Orders</DataTableHeaderCell>
                        <DataTableHeaderCell>Share of all orders</DataTableHeaderCell>
                      </tr>
                    </DataTableHead>
                    <DataTableBody>
                      {data.statuses.map((row) => (
                        <DataTableRow key={row.status}>
                          <DataTableCell className="pl-4">
                            <StatusChip status={row.status} />
                          </DataTableCell>
                          <DataTableCell numeric>
                            {formatCount(row.order_count)}
                          </DataTableCell>
                          <DataTableCell>
                            <MiniMeter
                              ariaLabel="Share of all orders"
                              value={row.order_count}
                              max={data.total_orders}
                              valueLabel={formatRate(
                                share(row.order_count, data.total_orders),
                                1,
                              )}
                              tone={getOrderStatusTone(row.status)}
                            />
                          </DataTableCell>
                        </DataTableRow>
                      ))}
                    </DataTableBody>
                  </DataTable>
                </DataTableScroll>
              </div>

              <DataTableScroll
                footer={
                  <TableFooter
                    shown={2}
                    total={2}
                    noun="cancellation outcomes"
                    sortedBy="whether the customer paid for it"
                    extra={`${formatCount(data.cancelled_orders)} cancellations in total`}
                  />
                }
              >
                <DataTable aria-label="Cancellations, inside and outside the free window">
                  <DataTableHead>
                    <tr>
                      <DataTableHeaderCell className="pl-4 w-[320px]">
                        Cancellation
                      </DataTableHeaderCell>
                      <DataTableHeaderCell numeric>Orders</DataTableHeaderCell>
                      <DataTableHeaderCell className="w-[240px]">
                        Share of cancellations
                      </DataTableHeaderCell>
                      <DataTableHeaderCell>What it means</DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    <DataTableRow>
                      <DataTableCell className="pl-4 text-ink">
                        Inside the free window
                      </DataTableCell>
                      <DataTableCell numeric>
                        {formatCount(data.cancelled_inside_window)}
                      </DataTableCell>
                      <DataTableCell>
                        <MiniMeter
                          ariaLabel="Share cancelled inside the free window"
                          value={data.cancelled_inside_window}
                          max={data.cancelled_orders}
                          valueLabel={formatRate(insideShare, 0)}
                          tone="ok"
                        />
                      </DataTableCell>
                      <DataTableCell className="text-ink-3">
                        Cancelled early enough to cost the customer nothing.
                      </DataTableCell>
                    </DataTableRow>
                    <DataTableRow>
                      <DataTableCell className="pl-4 text-ink">
                        After the free window
                      </DataTableCell>
                      <DataTableCell numeric>
                        {formatCount(data.cancelled_outside_window)}
                      </DataTableCell>
                      <DataTableCell>
                        <MiniMeter
                          ariaLabel="Share cancelled after the free window"
                          value={data.cancelled_outside_window}
                          max={data.cancelled_orders}
                          valueLabel={formatRate(outsideShare, 0)}
                          tone="crit"
                        />
                      </DataTableCell>
                      <DataTableCell className="text-ink-3">
                        A fee was charged. This is the number support hears about.
                      </DataTableCell>
                    </DataTableRow>
                  </DataTableBody>
                </DataTable>
              </DataTableScroll>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
