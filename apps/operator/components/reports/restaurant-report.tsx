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
  SEVERITY_LABEL,
  SEVERITY_TEXT,
  SeverityCell,
  Stat,
  StatRail,
  TableFooter,
  Thumb,
} from "@repo/ui";
import { BoardSkeleton, RailSkeleton } from "../board-skeleton";
import { QueryState } from "../query-state";
import {
  formatCount,
  formatDuration,
  formatMoney,
  formatMoneyWhole,
  formatRate,
} from "../../lib/format";
import { DECK_PANEL, DECK_RAIL } from "../../lib/deck";
import { median } from "../../lib/stats";
import { useRestaurantDirectory, useRestaurantReport } from "../../lib/queries";

/** The cover beside a kitchen's name, sized for a 38px row. */
const COVER_PX = 22;

/** Above this share of its own orders cancelled, a kitchen needs a call. */
const CANCELLATION_CONCERN = 0.15;

/** Minutes above the platform median end-to-end time before a row is graded. */
const SLIP_WARN_MINUTES = 12;
const SLIP_BAD_MINUTES = 25;

/**
 * Which kitchens earned the money, and which ones are costing it.
 *
 * The two columns worth reading together are the last two: what a kitchen says
 * its prep time is, and how long an order from it really takes end to end. Every
 * delivery promise the platform makes is built on the first number, so a kitchen
 * whose second number has drifted is not slow — it is making the platform lie to
 * customers, one order at a time.
 *
 * The grade is relative to the platform's own median rather than to a constant.
 * A fixed "over 45 minutes is bad" would flag every kitchen in the monsoon and
 * none of them in a quiet week.
 */
export function RestaurantReport({
  days,
}: {
  readonly days: number;
}): React.JSX.Element {
  const report = useRestaurantReport(days);
  const directory = useRestaurantDirectory();

  return (
    <QueryState
      query={report}
      errorTitle="The restaurant report could not load"
      emptyTitle="No kitchen took an order in this window"
      emptyDetail="Widen the range and every kitchen with at least one order appears here."
      isEmpty={(data) => data.rows.every((row) => row.delivered_orders === 0)}
      skeleton={
        <>
          <RailSkeleton label="Comparing the kitchens" />
          <BoardSkeleton
            rows={12}
            label="Loading the restaurant report"
            note="Comparing every kitchen against the platform median…"
          />
        </>
      }
    >
      {(data) => {
        const trading = data.rows.filter((row) => row.delivered_orders > 0);
        const medianMinutes = median(
          trading
            .map((row) => row.avg_delivery_minutes)
            .filter((value): value is number => value !== null),
        );

        const slipMinutes = (row: (typeof data.rows)[number]): number | null =>
          row.avg_delivery_minutes === null
            ? null
            : row.avg_delivery_minutes - medianMinutes;

        const tierFor = (row: (typeof data.rows)[number]): 0 | 1 | 2 | 3 => {
          const slip = slipMinutes(row);
          if (slip === null || slip < SLIP_WARN_MINUTES) return 0;
          if (slip < SLIP_BAD_MINUTES) return 1;
          return 2;
        };

        const slipping = trading.filter((row) => tierFor(row) > 0).length;
        const highCancellation = trading.filter(
          (row) => row.cancellation_rate >= CANCELLATION_CONCERN,
        ).length;
        const inactive = data.rows.filter((row) => !row.is_active).length;

        return (
          <>
            <div className={DECK_RAIL}>
              <StatRail ariaLabel="Kitchens over the window">
                <Stat
                  label="Trading"
                  value={formatCount(trading.length)}
                  caption={`of ${formatCount(data.rows.length)} on the platform`}
                  hint="Kitchens that delivered at least one order inside the window. The rest are listed too, at zero."
                />
                <Stat
                  label="Revenue"
                  value={formatMoneyWhole(data.gross)}
                  caption={`${formatMoneyWhole(data.commission)} kept as commission`}
                  hint="What customers paid these kitchens for delivered orders, and Foodishi's share of it."
                />
                <Stat
                  label="Typical order"
                  value={formatDuration(medianMinutes)}
                  caption="Placed to handed over, median"
                  hint="The platform's middle kitchen, end to end. The grade on each row is measured against this rather than against a fixed target."
                />
                <Stat
                  label="Slipping"
                  value={formatCount(slipping)}
                  tone={slipping > 0 ? "alarm" : "ok"}
                  caption={
                    slipping > 0
                      ? `More than ${formatDuration(SLIP_WARN_MINUTES)} above typical`
                      : "Everyone near the median"
                  }
                  hint="Their real end-to-end time has drifted above the platform's, so every promise built on their declared prep time runs late."
                />
                <Stat
                  label="Cancelling"
                  value={formatCount(highCancellation)}
                  tone={highCancellation > 0 ? "warn" : "default"}
                  caption={
                    inactive > 0
                      ? `${formatCount(inactive)} kitchens switched off`
                      : `Over ${formatRate(CANCELLATION_CONCERN, 0)} of their own orders`
                  }
                  hint="Kitchens rejecting or cancelling an unusual share of what they take. Each one costs a refund and a customer."
                />
              </StatRail>
            </div>

            <DataTableScroll
              className={DECK_PANEL}
              footer={
                <TableFooter
                  shown={data.rows.length}
                  total={data.rows.length}
                  noun="kitchens"
                  sortedBy="revenue delivered, largest first"
                  extra={`typical order takes ${formatDuration(medianMinutes)} end to end`}
                />
              }
            >
              <DataTable aria-label="Kitchen performance over the window">
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="pl-4">Kitchen</DataTableHeaderCell>
                    <DataTableHeaderCell>City</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Delivered</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Revenue</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Commission</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Cancelled</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Declared prep</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Really takes</DataTableHeaderCell>
                    <DataTableHeaderCell>State</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {data.rows.map((row) => {
                    const tier = tierFor(row);
                    const slip = slipMinutes(row);
                    const cover = directory.data?.get(row.restaurant_id)?.image_url;

                    return (
                      <DataTableRow key={row.restaurant_id}>
                        <SeverityCell
                          tier={tier}
                          title={tier === 0 ? undefined : SEVERITY_LABEL[tier]}
                          className="max-w-[220px] font-medium text-ink"
                        >
                          <span className="flex items-center gap-2">
                            <Thumb src={cover} name={row.name} size={COVER_PX} />
                            <span className="truncate">{row.name}</span>
                          </span>
                        </SeverityCell>
                        <DataTableCell className="text-ink-3">{row.city}</DataTableCell>
                        <DataTableCell numeric>
                          {row.delivered_orders === 0 ? (
                            <span className="text-ink-4">none</span>
                          ) : (
                            formatCount(row.delivered_orders)
                          )}
                        </DataTableCell>
                        <DataTableCell numeric>{formatMoney(row.gross)}</DataTableCell>
                        <DataTableCell numeric>
                          {formatMoney(row.commission)}
                        </DataTableCell>
                        <DataTableCell numeric>
                          <span
                            className={
                              row.cancellation_rate >= CANCELLATION_CONCERN
                                ? "text-warn"
                                : "text-ink-2"
                            }
                          >
                            {formatRate(row.cancellation_rate, 1)}
                          </span>
                        </DataTableCell>
                        <DataTableCell numeric>
                          {formatDuration(row.avg_prep_minutes)}
                        </DataTableCell>
                        <DataTableCell numeric>
                          {row.avg_delivery_minutes === null ? (
                            <span className="text-ink-4">no deliveries</span>
                          ) : (
                            <span
                              className={tier === 0 ? "text-ink-2" : SEVERITY_TEXT[tier]}
                            >
                              {formatDuration(row.avg_delivery_minutes)}
                              {slip !== null && slip >= SLIP_WARN_MINUTES
                                ? ` (+${formatDuration(slip)})`
                                : ""}
                            </span>
                          )}
                        </DataTableCell>
                        <DataTableCell>
                          {row.is_active ? (
                            <Badge tone="ok">Active</Badge>
                          ) : (
                            <Badge tone="warn">Switched off</Badge>
                          )}
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
  );
}
