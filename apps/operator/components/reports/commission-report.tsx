"use client";

import * as React from "react";
import Link from "next/link";
import {
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
} from "@repo/ui";
import { BoardSkeleton, RailSkeleton } from "../board-skeleton";
import { CommissionLedgerTable } from "../commission-ledger-table";
import { MiniMeter } from "../mini-meter";
import { QueryState } from "../query-state";
import { WidenWindow } from "../widen-window";
import {
  formatCount,
  formatMoney,
  formatMoneyWhole,
  formatRate,
  toNumber,
} from "../../lib/format";
import { DECK_PANEL, DECK_RAIL } from "../../lib/deck";
import { useCommissionReport } from "../../lib/queries";

/**
 * What the platform kept, and what it owes.
 *
 * Read city-first, then kitchen. Three cities behave differently enough that a
 * single platform-wide commission figure hides the only actionable thing in it:
 * one city carrying the revenue while another carries the rate.
 *
 * The per-kitchen ledger underneath is the same table the Payments page shows,
 * from the same call. Two implementations of "what this kitchen owes us" is how a
 * report and a finance screen end up disagreeing about a percentage.
 */
export function CommissionReport({
  days,
  onWiden,
}: {
  readonly days: number;
  /** Offered from the empty state when a wider window has orders (OP-5). */
  readonly onWiden?: (days: number) => void;
}): React.JSX.Element {
  const report = useCommissionReport(days);

  return (
    <QueryState
      query={report}
      errorTitle="The commission report could not load"
      emptyAction={
        onWiden === undefined ? undefined : <WidenWindow days={days} onWiden={onWiden} />
      }
      emptyTitle="Nothing was delivered in this window"
      emptyDetail="Commission is charged on delivered orders, so a window with no deliveries earns nothing."
      isEmpty={(data) => toNumber(data.ledger.gross) === 0}
      skeleton={
        <>
          <RailSkeleton label="Adding up the commission" />
          <BoardSkeleton
            rows={10}
            label="Loading the commission report"
            note="Working out each city's share…"
          />
        </>
      }
    >
      {(data) => {
        const { ledger, cities } = data;
        const effectiveRate =
          toNumber(ledger.food_value) === 0
            ? 0
            : toNumber(ledger.commission) / toNumber(ledger.food_value);
        const negotiated = ledger.rows.filter((row) => row.is_negotiated).length;
        const topCityCommission = Math.max(
          ...cities.map((row) => toNumber(row.commission)),
          1,
        );

        return (
          <>
            <div className={DECK_RAIL}>
              <StatRail ariaLabel="Commission over the window">
                <Stat
                  label="Commission"
                  value={formatMoneyWhole(ledger.commission)}
                  tone="ok"
                  caption={`Over ${formatCount(ledger.days)} days`}
                  hint="What Foodishi earned from delivered orders in this window, at each kitchen's own rate."
                />
                <Stat
                  label="Effective rate"
                  value={formatRate(effectiveRate, 1)}
                  caption={`${formatCount(toNumber(ledger.default_percent))}% is the platform default`}
                  hint="Commission divided by the food value it was charged on. It sits away from the default whenever the negotiated kitchens are the ones trading."
                />
                <Stat
                  label="Gross delivered"
                  value={formatMoneyWhole(ledger.gross)}
                  caption={`${formatMoneyWhole(ledger.food_value)} of it food`}
                  hint="What customers paid, all in. Commission is charged on the food alone — delivery and packaging are pass-through, and taxing the tax is not ours to do."
                />
                <Stat
                  label="Owed to kitchens"
                  value={formatMoneyWhole(ledger.payout)}
                  caption={`Settled after ${formatCount(ledger.settlement_days)} days`}
                  hint="Gross less commission: the platform's liability to its restaurants for this window."
                />
                <Stat
                  label="Off standard rate"
                  value={formatCount(negotiated)}
                  tone="default"
                  caption={
                    negotiated > 0
                      ? "Negotiated separately"
                      : "Everyone on the same rate"
                  }
                  hint="Kitchens on a rate agreed outside the platform default. Each is set, with its reason, on the Settings page."
                />
              </StatRail>
            </div>

            <DataTableScroll
              className="shrink-0"
              footer={
                <TableFooter
                  shown={cities.length}
                  total={cities.length}
                  noun="cities"
                  sortedBy="commission earned, largest first"
                  extra={
                    <>
                      rates are configured on{" "}
                      <Link
                        href="/settings"
                        className="font-medium text-accent underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        Settings
                      </Link>
                    </>
                  }
                />
              }
            >
              <DataTable aria-label="Commission by city, largest first">
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell className="pl-4">City</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Kitchens</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Delivered</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Gross</DataTableHeaderCell>
                    <DataTableHeaderCell className="w-[240px]">
                      Commission
                    </DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {cities.map((row) => (
                    <DataTableRow key={row.city}>
                      <DataTableCell className="pl-4 font-medium text-ink">
                        {row.city}
                      </DataTableCell>
                      <DataTableCell numeric>
                        {formatCount(row.restaurants)}
                      </DataTableCell>
                      <DataTableCell numeric>
                        {formatCount(row.delivered_orders)}
                      </DataTableCell>
                      <DataTableCell numeric>{formatMoney(row.gross)}</DataTableCell>
                      <DataTableCell>
                        <MiniMeter
                          ariaLabel={`${row.city} commission`}
                          value={toNumber(row.commission)}
                          max={topCityCommission}
                          valueLabel={formatMoney(row.commission)}
                          tone="ok"
                        />
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </DataTableScroll>

            <CommissionLedgerTable ledger={ledger} className={DECK_PANEL} />
          </>
        );
      }}
    </QueryState>
  );
}
