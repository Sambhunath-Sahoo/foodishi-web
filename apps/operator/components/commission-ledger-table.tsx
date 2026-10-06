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
  TableFooter,
} from "@repo/ui";
import { MiniMeter } from "./mini-meter";
import {
  formatCount,
  formatMoney,
  formatMoneyWhole,
  formatRate,
  toNumber,
} from "../lib/format";
import type { CommissionLedger } from "../lib/services/types";

export interface CommissionLedgerTableProps {
  readonly ledger: CommissionLedger;
  /** Deck class from the page, so whichever panel should shrink can say so. */
  readonly className?: string;
}

/**
 * What each kitchen earned and what the platform kept of it.
 *
 * One table, used by both the Payments page and the commission report, because
 * "what does this kitchen owe us" must have exactly one answer and one layout.
 * Two implementations of this table is how a finance screen and a report end up
 * disagreeing about a rate.
 *
 * Gross and food value sit side by side deliberately: commission is charged on
 * the food alone, and a percentage with an invisible base is a number nobody can
 * check.
 */
export function CommissionLedgerTable({
  ledger,
  className,
}: CommissionLedgerTableProps): React.JSX.Element {
  const topCommission = Math.max(
    ...ledger.rows.map((row) => toNumber(row.commission)),
    1,
  );

  return (
    <DataTableScroll
      className={className}
      footer={
        <TableFooter
          shown={ledger.rows.length}
          total={ledger.rows.length}
          noun="kitchens"
          sortedBy="commission earned, largest first"
          extra={`${formatMoneyWhole(ledger.commission)} on ${formatMoneyWhole(ledger.food_value)} of food over ${formatCount(ledger.days)} days`}
        />
      }
    >
      <DataTable aria-label="Commission per kitchen, largest first">
        <DataTableHead>
          <tr>
            <DataTableHeaderCell className="pl-4">Kitchen</DataTableHeaderCell>
            <DataTableHeaderCell>City</DataTableHeaderCell>
            <DataTableHeaderCell numeric>Delivered</DataTableHeaderCell>
            <DataTableHeaderCell numeric>Gross</DataTableHeaderCell>
            <DataTableHeaderCell numeric>Food value</DataTableHeaderCell>
            <DataTableHeaderCell>Rate</DataTableHeaderCell>
            <DataTableHeaderCell className="w-[210px]">
              Commission
            </DataTableHeaderCell>
            <DataTableHeaderCell numeric>Owed to them</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {ledger.rows.map((row) => (
            <DataTableRow key={row.restaurant_id}>
              <DataTableCell className="max-w-[220px] pl-4 font-medium text-ink">
                <span className="truncate">{row.name}</span>
              </DataTableCell>
              <DataTableCell className="text-ink-3">{row.city}</DataTableCell>
              <DataTableCell numeric>
                {row.delivered_orders === 0 ? (
                  <span className="text-ink-3">none</span>
                ) : (
                  formatCount(row.delivered_orders)
                )}
              </DataTableCell>
              <DataTableCell numeric>{formatMoney(row.gross)}</DataTableCell>
              <DataTableCell numeric>
                {formatMoney(row.food_value)}
              </DataTableCell>
              <DataTableCell>
                {row.is_negotiated ? (
                  <Badge tone="mute">
                    {formatRate(toNumber(row.commission_percent) / 100, 0)} negotiated
                  </Badge>
                ) : (
                  <span className="font-mono text-[12px] tabular-nums text-ink-3">
                    {formatRate(toNumber(row.commission_percent) / 100, 0)}
                  </span>
                )}
              </DataTableCell>
              <DataTableCell>
                <MiniMeter
                  ariaLabel={`${row.name} commission`}
                  value={toNumber(row.commission)}
                  max={topCommission}
                  valueLabel={formatMoney(row.commission)}
                  tone={row.is_negotiated ? "mute" : "ok"}
                />
              </DataTableCell>
              <DataTableCell numeric>{formatMoney(row.payout)}</DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </DataTableScroll>
  );
}
