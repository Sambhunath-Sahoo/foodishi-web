"use client";

import * as React from "react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  formatLate,
  StatusChip,
  TableFooter,
} from "@repo/ui";
import { formatClock, formatCount, formatMoney, formatOrderRef } from "../lib/format";
import { CustomerCell, KitchenCell, type BoardLookups, type BoardRow } from "./live-rows";
import { RowAction } from "./row-action";

/** The stuck list scrolls inside itself past this, so it never buries the page. */
const STUCK_MAX_HEIGHT = 320;

export interface StuckOrdersProps {
  /** Oldest promise first. */
  readonly rows: readonly BoardRow[];
  readonly lookups: BoardLookups;
  readonly nowMs: number;
  readonly selectedOrderId: number | null;
  readonly onOpen: (orderId: number) => void;
}

/**
 * Live orders more than six hours past their promise, kept off the live queue.
 *
 * Collapsed by default and deliberately quiet — no severity stripe, no red
 * lateness — because the stripe exists to rank what to do next, and every row
 * here is past the point where ranking means anything (OP-3). What they need is
 * a decision about the money, so each row's one action leads to it: the order
 * drawer, whose footer states the refund before anything is pressed.
 *
 * A `<details>` element rather than a hand-rolled toggle: it is keyboard- and
 * screen-reader-operable for free, and the count in its summary is readable
 * without opening it.
 */
export function StuckOrders({
  rows,
  lookups,
  nowMs,
  selectedOrderId,
  onOpen,
}: StuckOrdersProps): React.JSX.Element | null {
  if (rows.length === 0) return null;

  return (
    <details className="group shrink-0 rounded-card border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 font-sans text-[13px] text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-ink-3 transition-transform group-open:rotate-90">
          ▸
        </span>
        <span className="font-semibold text-ink">
          Stuck — over 6 h past promise ({formatCount(rows.length)})
        </span>
        <span className="text-[12px] text-ink-3">
          Not on the live queue. Each one needs a decision about the money, not a rider.
        </span>
      </summary>

      <div className="border-t border-line">
        <DataTableScroll
          maxHeight={STUCK_MAX_HEIGHT}
          className="rounded-none border-0"
          footer={
            <TableFooter
              shown={rows.length}
              total={rows.length}
              noun="stuck orders"
              sortedBy="oldest promise first"
            />
          }
        >
          <DataTable aria-label="Stuck orders, oldest promise first">
            <DataTableHead>
              <tr>
                <DataTableHeaderCell className="pl-4">Order</DataTableHeaderCell>
                <DataTableHeaderCell>Kitchen</DataTableHeaderCell>
                <DataTableHeaderCell>Customer</DataTableHeaderCell>
                <DataTableHeaderCell>State</DataTableHeaderCell>
                <DataTableHeaderCell>Was due</DataTableHeaderCell>
                <DataTableHeaderCell>Past promise</DataTableHeaderCell>
                <DataTableHeaderCell numeric>Total</DataTableHeaderCell>
                <DataTableHeaderCell numeric>Decide</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {rows.map((row) => (
                <DataTableRow
                  key={row.order.id}
                  selected={row.order.id === selectedOrderId}
                  onClick={() => onOpen(row.order.id)}
                  className="cursor-pointer text-ink-3"
                >
                  <DataTableCell className="pl-4">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(row.order.id);
                      }}
                      aria-label={`Open order ${formatOrderRef(row.order.id)}`}
                      className="rounded-card font-mono text-[12px] font-medium text-accent underline underline-offset-2 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {formatOrderRef(row.order.id)}
                    </button>
                  </DataTableCell>
                  <KitchenCell row={row} lookup={lookups.kitchens} />
                  <CustomerCell row={row} lookup={lookups.customers} />
                  <DataTableCell>
                    <StatusChip status={row.order.status} />
                  </DataTableCell>
                  <DataTableCell mono>{formatClock(row.order.promised_at, nowMs)}</DataTableCell>
                  <DataTableCell className="text-ink-3">
                    {formatLate(row.lateness?.lateMinutes ?? 0)}
                  </DataTableCell>
                  <DataTableCell numeric>{formatMoney(row.order.total_amount)}</DataTableCell>
                  <DataTableCell numeric>
                    {/* Neutral, and worded as what an operator can really do.
                        The API has no admin cancel route, so a red "Cancel &
                        refund…" on every row led to a confirm that could only
                        ever be disabled. Only the kitchen can cancel; this
                        opens the order with the refund figure to ask it with. */}
                    <RowAction
                      onClick={() => onOpen(row.order.id)}
                      ariaLabel={`Ask the kitchen to cancel ${formatOrderRef(row.order.id)}: opens the order`}
                      title="Opens the order with the refund the customer is owed. Only the kitchen can cancel it."
                    >
                      Ask kitchen to cancel…
                    </RowAction>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </DataTableScroll>
      </div>
    </details>
  );
}
