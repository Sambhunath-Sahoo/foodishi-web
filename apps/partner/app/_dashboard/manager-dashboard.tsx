"use client";

import * as React from "react";
import {
  AutoScaleChart,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Stat,
  StatRail,
  UsageBar,
  type AutoChartPoint,
} from "@repo/ui";
import { ServiceBoard } from "./service-board";
import { LinkButton } from "../_components/link-button";
import { CardSkeletons, LoadError } from "../_components/states";
import {
  daysAgoDate,
  formatCount,
  formatDay,
  formatMoney,
  formatMoneyRound,
  formatPercent,
  pluralise,
  toLocalDate,
} from "../_lib/format";
import { byUrgency, readLateness } from "../_lib/lateness";
import { TICK_QUEUE_MS, useNow } from "../_lib/use-now";
import { windowFor } from "../_lib/windows";
import { SLOW_REFRESH_MS } from "../../lib/query-keys";
import { useLiveOrders } from "../../lib/queries/orders";
import { usePerformance, useSalesReport } from "../../lib/queries/reports";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { SalesDay } from "../../lib/types";

/** Two weeks is enough context to see today against, and still fits one row. */
const TREND_DAYS = 13;

function toPoints(days: readonly SalesDay[]): readonly AutoChartPoint[] {
  return days.map((day) => ({ label: formatDay(day.date), value: Number(day.revenue) }));
}

/**
 * The manager's dashboard: service first, then the day, then the fortnight.
 *
 * The order is the point. A manager who opens this console at eight in the
 * evening needs the same four numbers a cook does — an unanswered ticket is
 * still the most urgent thing in the building — and the money underneath it.
 * Putting revenue at the top would make the loudest thing on the screen a
 * figure nobody can act on for another three hours.
 *
 * Every revenue figure counts DELIVERED orders only. Cancelled trade is not
 * revenue and in-flight trade is not revenue yet, and saying so in a caption
 * costs one line and saves an argument.
 */
export function ManagerDashboard({
  kitchen,
}: {
  readonly kitchen: ReadyKitchen;
}): React.JSX.Element {
  // TWO clocks, on purpose, where there used to be one frozen one and one live
  // read inside render.
  //
  // `now` is ticking, because the live queue is graded against it: frozen at
  // mount, a tablet left on the pass all evening kept grading every ticket as
  // hours less late than it was, so "most urgent first" silently stopped being
  // true — while the late COUNT above the board read Date.now() during render
  // and was correct. The two disagreed by construction and neither looked wrong.
  //
  // `mountedAt` is frozen, because the report windows must not jitter: a window
  // recomputed on every tick would refetch the sales and performance queries
  // every 15 seconds for no new data. StaffDashboard already does the ticking
  // half correctly; this is the same shape.
  const now = useNow(TICK_QUEUE_MS);
  const mountedAt = React.useMemo(() => Date.now(), []);
  const queue = useLiveOrders(kitchen);

  const today = React.useMemo(() => windowFor("today", mountedAt), [mountedAt]);
  // The chart's own window, wider than any of the three named ranges: today
  // means nothing on its own, and a fortnight is what makes it a good day or a
  // bad one.
  const fortnight = React.useMemo(
    () => ({
      from: daysAgoDate(TREND_DAYS, mountedAt),
      to: toLocalDate(mountedAt),
    }),
    [mountedAt],
  );

  const sales = useSalesReport(kitchen, fortnight);
  const performance = usePerformance(kitchen, today);

  const liveOrders = queue.data === undefined ? [] : byUrgency(queue.data.items, now);
  const isQueueLoaded = queue.data !== undefined;
  // The same `now` the board was ordered by, not a fresh Date.now() read during
  // render — so the tile and the ordering beneath it describe one instant.
  const late = liveOrders.filter(
    (order) => readLateness(order.status, order.promised_at, now).isLate,
  ).length;

  const days = sales.data ?? [];
  const todayRow = days.length === 0 ? undefined : days[days.length - 1];
  const previous = days.slice(0, -1);
  const dailyAverage =
    previous.length === 0
      ? 0
      : previous.reduce((total, day) => total + Number(day.revenue), 0) / previous.length;

  return (
    <div className="flex flex-col gap-5">
      <ServiceBoard orders={liveOrders} isLoaded={isQueueLoaded} />

      {queue.error !== null ? (
        <LoadError
          error={queue.error}
          title="Could not load the live queue"
          onRetry={() => {
            void queue.refetch();
          }}
        />
      ) : null}

      {sales.isPending || performance.isPending ? (
        <CardSkeletons count={2} label="Adding up today" />
      ) : null}

      {sales.error !== null ? (
        <LoadError
          error={sales.error}
          title="Could not add up the last two weeks"
          onRetry={() => {
            void sales.refetch();
          }}
        />
      ) : null}

      {todayRow !== undefined && performance.data !== undefined ? (
        <>
          <StatRail ariaLabel="Today so far">
            <Stat
              label="Revenue today"
              value={formatMoneyRound(todayRow.revenue)}
              caption={`${pluralise(todayRow.delivered, "delivered order", "delivered orders")}`}
              hint="Delivered orders only, since midnight. Cancelled and in-flight orders contribute nothing until they land."
            />
            <Stat
              label="Orders today"
              value={formatCount(todayRow.orders)}
              caption={`${formatCount(todayRow.delivered)} delivered · ${formatCount(todayRow.cancelled)} cancelled`}
              hint="Every ticket placed since midnight, however it ended."
            />
            <Stat
              label="Average order"
              value={
                performance.data.delivered === 0
                  ? "—"
                  : formatMoney(performance.data.avg_order_value)
              }
              caption={
                performance.data.delivered === 0
                  ? "No delivered orders yet"
                  : `Across ${formatCount(performance.data.delivered)} delivered`
              }
              hint="Today's delivered revenue divided by the number of delivered orders."
            />
            <Stat
              label="On time"
              value={
                performance.data.delivered === 0
                  ? "—"
                  : formatPercent(performance.data.on_time_rate)
              }
              tone={
                performance.data.delivered > 0 && performance.data.on_time_rate < 0.8
                  ? "alarm"
                  : "default"
              }
              caption={
                late > 0
                  ? `${formatCount(late)} live ticket${late === 1 ? "" : "s"} already late`
                  : "Every live ticket still in time"
              }
              hint="Delivered on or before the time the customer was promised, as a share of today's delivered orders."
            />
          </StatRail>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue, last {TREND_DAYS + 1} days</CardTitle>
                <span className="font-mono text-[13px] tabular-nums text-ink-3">
                  {formatMoneyRound(dailyAverage)} / day average
                </span>
              </CardHeader>
              <CardBody>
                <AutoScaleChart
                  points={toPoints(days)}
                  ariaLabel={`Delivered revenue per day over the last ${TREND_DAYS + 1} days`}
                  formatValue={(value) => formatMoneyRound(value)}
                  caption="Delivered orders only. The peak is labelled with its own day."
                  emptyCaption="No delivered orders in this period — nothing has been completed yet."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How the kitchen is doing</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-4">
                <UsageBar
                  label="Delivered on time"
                  value={Math.round(performance.data.on_time_rate * 100)}
                  max={100}
                  valueLabel={
                    performance.data.delivered === 0
                      ? "no orders yet"
                      : formatPercent(performance.data.on_time_rate)
                  }
                  tone={performance.data.on_time_rate < 0.8 ? "warn" : "ok"}
                />
                <dl className="flex flex-col gap-2 text-[14px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-3">Average time to ready</dt>
                    <dd className="font-mono tabular-nums text-ink">
                      {performance.data.avg_prep_minutes === 0
                        ? "—"
                        : `${performance.data.avg_prep_minutes}m`}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-3">Placed to delivered</dt>
                    <dd className="font-mono tabular-nums text-ink">
                      {performance.data.avg_delivery_minutes === 0
                        ? "—"
                        : `${performance.data.avg_delivery_minutes}m`}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-3">Rejected today</dt>
                    <dd className="font-mono tabular-nums text-ink">
                      {formatCount(performance.data.rejected)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-3">Customer rating</dt>
                    <dd className="font-mono tabular-nums text-ink">
                      {performance.data.rating} ·{" "}
                      <span className="text-ink-3">
                        {formatCount(performance.data.rating_count)}
                      </span>
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <LinkButton href="/reports">Full reports</LinkButton>
                  {kitchen.can("payments.view") ? (
                    <LinkButton href="/payments">Earnings</LinkButton>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      ) : null}

      {performance.error !== null ? (
        <LoadError
          error={performance.error}
          title="Could not measure today's performance"
          onRetry={() => {
            void performance.refetch();
          }}
        />
      ) : null}

      <p className="text-[12px] text-ink-3">
        The rail and the chart re-read every{" "}
        {Math.round(SLOW_REFRESH_MS / 1000)} seconds. The four service numbers
        above them re-read every ten.
      </p>
    </div>
  );
}
