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
  Stat,
  StatRail,
  TableFooter,
  Thumb,
} from "@repo/ui";
import { BoardSkeleton, RailSkeleton } from "../board-skeleton";
import { MiniMeter } from "../mini-meter";
import { QueryState } from "../query-state";
import {
  formatCount,
  formatDateTime,
  formatMoney,
  formatMoneyWhole,
  formatRate,
  toNumber,
} from "../../lib/format";
import { DECK_PANEL, DECK_RAIL } from "../../lib/deck";
import { useCustomerReport } from "../../lib/queries";

/** The avatar in a 38px row. */
const AVATAR_PX = 24;

/**
 * Who is spending, and whether they came back.
 *
 * New against returning is the figure worth watching. A window where almost
 * everybody is new looks like growth and is usually churn wearing growth's
 * clothes: the platform is buying first orders and not keeping them. "New" here
 * means their first ever order fell inside the window, not that their account
 * was created in it — somebody who signed up in March and finally ordered this
 * week is a new customer to the business, whatever the account says.
 *
 * The table is the top spenders only. A full directory is what the Customers
 * page is for; a report listing ninety rows in spend order is a list nobody
 * scrolls past the fifth of.
 */
export function CustomerReport({
  days,
}: {
  readonly days: number;
}): React.JSX.Element {
  const report = useCustomerReport(days);

  return (
    <QueryState
      query={report}
      errorTitle="The customer report could not load"
      emptyTitle="Nobody ordered in this window"
      emptyDetail="Widen the range and every customer who placed an order appears here, biggest spender first."
      isEmpty={(data) => data.rows.length === 0}
      skeleton={
        <>
          <RailSkeleton label="Adding up what customers spent" />
          <BoardSkeleton
            rows={12}
            label="Loading the customer report"
            note="Summing each customer's orders…"
          />
        </>
      }
    >
      {(data) => {
        const returningShare =
          data.customers === 0 ? 0 : data.returning_customers / data.customers;
        const topSpend = Math.max(
          ...data.rows.map((row) => toNumber(row.spend)),
          1,
        );
        const perCustomer =
          data.customers === 0 ? 0 : toNumber(data.spend) / data.customers;

        return (
          <>
            <div className={DECK_RAIL}>
              <StatRail ariaLabel="Customers over the window">
                <Stat
                  label="Ordered"
                  value={formatCount(data.customers)}
                  caption={`Over ${formatCount(data.days)} days`}
                  hint="Customers who placed at least one order inside the window. Accounts that sat idle are not counted."
                />
                <Stat
                  label="First-time"
                  value={formatCount(data.new_customers)}
                  caption={`${formatRate(1 - returningShare, 0)} of everyone who ordered`}
                  hint="Their first ever order fell inside this window. Measured on ordering, not on when the account was created."
                />
                <Stat
                  label="Came back"
                  value={formatCount(data.returning_customers)}
                  tone={returningShare >= 0.5 ? "ok" : "warn"}
                  caption={`${formatRate(returningShare, 0)} had ordered before`}
                  hint="Customers who had ordered before this window and ordered again inside it. This is the number that says whether the platform keeps anybody."
                />
                <Stat
                  label="Spend"
                  value={formatMoneyWhole(data.spend)}
                  caption={`${formatMoneyWhole(perCustomer)} each on average`}
                  hint="What these customers actually paid: the total of their delivered orders in the window."
                />
                <Stat
                  label="Never ordered"
                  value={formatCount(data.never_ordered)}
                  tone={data.never_ordered > 0 ? "warn" : "default"}
                  caption="Registered, never bought"
                  hint="Accounts that have never placed an order at all, in any window. They signed up and stopped."
                />
              </StatRail>
            </div>

            <DataTableScroll
              className={DECK_PANEL}
              footer={
                <TableFooter
                  shown={data.rows.length}
                  total={data.customers}
                  noun="customers"
                  sortedBy="what they spent, biggest first"
                  extra={`the top ${formatCount(data.rows.length)} of ${formatCount(data.customers)} who ordered`}
                />
              }
            >
              <DataTable aria-label="Top customers by spend">
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="pl-4">Customer</DataTableHeaderCell>
                    <DataTableHeaderCell>City</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Orders</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Delivered</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Cancelled</DataTableHeaderCell>
                    <DataTableHeaderCell className="w-[220px]">Spend</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Average order</DataTableHeaderCell>
                    <DataTableHeaderCell>Last ordered</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {data.rows.map((row) => (
                    <DataTableRow key={row.user_id}>
                      <DataTableCell className="max-w-[220px] pl-4 text-ink">
                        <span className="flex items-center gap-2">
                          <Thumb
                            src={row.avatar_url}
                            name={row.name}
                            size={AVATAR_PX}
                            shape="circle"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {row.name}
                            </span>
                            <span className="block truncate text-[11px] text-ink-4">
                              {row.email}
                            </span>
                          </span>
                          {row.is_active ? null : (
                            <Badge tone="warn" className="shrink-0">
                              Off
                            </Badge>
                          )}
                        </span>
                      </DataTableCell>
                      <DataTableCell className="text-ink-3">{row.city}</DataTableCell>
                      <DataTableCell numeric>{formatCount(row.orders)}</DataTableCell>
                      <DataTableCell numeric>{formatCount(row.delivered)}</DataTableCell>
                      <DataTableCell numeric>
                        {row.cancelled === 0 ? (
                          <span className="text-ink-4">—</span>
                        ) : (
                          <span className="text-warn">{formatCount(row.cancelled)}</span>
                        )}
                      </DataTableCell>
                      <DataTableCell>
                        <MiniMeter
                          ariaLabel={`${row.name} spend`}
                          value={toNumber(row.spend)}
                          max={topSpend}
                          valueLabel={formatMoney(row.spend)}
                          tone="ok"
                        />
                      </DataTableCell>
                      <DataTableCell numeric>
                        {row.delivered === 0 ? (
                          <span className="text-ink-4">—</span>
                        ) : (
                          formatMoney(row.avg_order_value)
                        )}
                      </DataTableCell>
                      <DataTableCell mono>
                        {row.last_ordered_at === null
                          ? "—"
                          : formatDateTime(row.last_ordered_at)}
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
