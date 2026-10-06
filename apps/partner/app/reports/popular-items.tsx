"use client";

import * as React from "react";
import {
  Badge,
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
  TableFooter,
  UsageBar,
} from "@repo/ui";
import { EmptyCard, LoadError } from "../_components/states";
import { formatCount, formatMoney, formatMoneyRound } from "../_lib/format";
import { describeRange, type RangeKey } from "../_lib/windows";
import { usePopularItems } from "../../lib/queries/reports";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { PopularItem, ReportWindow } from "../../lib/types";

type Sort = "quantity" | "revenue";

const SORTS: readonly { readonly value: Sort; readonly label: string }[] = [
  { value: "quantity", label: "By plates sold" },
  { value: "revenue", label: "By revenue" },
];

/** Enough to act on. A menu of thirty read top to bottom is not a report. */
const SHOWN = 15;

function sortRows(rows: readonly PopularItem[], sort: Sort): readonly PopularItem[] {
  return [...rows].sort((left, right) =>
    sort === "quantity"
      ? right.quantity - left.quantity
      : Number(right.revenue) - Number(left.revenue),
  );
}

/**
 * What actually sells.
 *
 * Two orderings, and they disagree in a way that matters: the biryani sells the
 * most plates and the mutton one earns the most money, and a manager deciding
 * what to promote needs to be able to see both. Defaulting to plates sold —
 * that is the question people ask first.
 *
 * The bar is drawn against the top row rather than against a total, so the shape
 * of the list is the comparison. And a dish that is currently sold out is marked:
 * the most common reason a popular dish stops selling is that nobody turned it
 * back on.
 */
export function PopularItemsTable({
  kitchen,
  window,
  range,
}: {
  readonly kitchen: ReadyKitchen;
  readonly window: ReportWindow;
  readonly range: RangeKey;
}): React.JSX.Element {
  const [sort, setSort] = React.useState<Sort>("quantity");
  const items = usePopularItems(kitchen, window);

  const sorted = sortRows(items.data ?? [], sort);
  const rows = sorted.slice(0, SHOWN);
  const peak =
    rows.length === 0
      ? 1
      : sort === "quantity"
        ? Math.max(...rows.map((row) => row.quantity))
        : Math.max(...rows.map((row) => Number(row.revenue)));

  return (
    <Card>
      <CardHeader className="flex-wrap gap-3">
        <CardTitle>What sells</CardTitle>
        <SegmentedControl
          ariaLabel="Order the dishes by"
          options={SORTS}
          value={sort}
          onValueChange={setSort}
        />
        <span className="text-[13px] text-ink-3">{describeRange(range)}</span>
      </CardHeader>
      <CardBody className="p-0">
        {items.error !== null ? (
          <div className="p-4">
            <LoadError
              error={items.error}
              title="Could not work out what sells"
              refusedTitle="Reports are not on the live API yet"
              onRetry={() => {
                void items.refetch();
              }}
            />
          </div>
        ) : null}

        {items.data !== undefined && sorted.length === 0 ? (
          <EmptyCard
            title="Nothing was delivered in this period"
            detail="A dish appears here once an order containing it has been delivered. Cancelled orders do not count — those plates were not sold."
          />
        ) : null}

        {rows.length > 0 ? (
          <DataTableScroll
            footer={
              <TableFooter
                shown={rows.length}
                total={sorted.length}
                noun="dishes"
                sortedBy={sort === "quantity" ? "plates sold" : "revenue"}
                extra={`${formatMoneyRound(
                  sorted.reduce((total, row) => total + Number(row.revenue), 0),
                )} across every dish`}
              />
            }
          >
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell numeric>#</DataTableHeaderCell>
                  <DataTableHeaderCell>Dish</DataTableHeaderCell>
                  <DataTableHeaderCell className="w-[200px]">
                    {sort === "quantity" ? "Plates sold" : "Revenue"}
                  </DataTableHeaderCell>
                  <DataTableHeaderCell numeric>Orders</DataTableHeaderCell>
                  <DataTableHeaderCell numeric>
                    {sort === "quantity" ? "Revenue" : "Plates"}
                  </DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {rows.map((row, index) => (
                  <DataTableRow key={row.menu_item_id} className="h-auto min-h-[48px]">
                    <DataTableCell numeric mono className="text-ink-3">
                      {index + 1}
                    </DataTableCell>
                    <DataTableCell wrap className="max-w-[260px]">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] leading-snug text-ink">
                          {row.name}
                        </span>
                        {row.is_available ? null : (
                          <Badge
                            tone="crit"
                            title="This dish is marked sold out right now, so it is not selling at all today."
                          >
                            Sold out
                          </Badge>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-ink-3">
                        {row.category_name}
                      </span>
                    </DataTableCell>
                    <DataTableCell className="py-2">
                      <UsageBar
                        label={row.name}
                        value={sort === "quantity" ? row.quantity : Number(row.revenue)}
                        max={peak}
                        valueLabel={
                          sort === "quantity"
                            ? formatCount(row.quantity)
                            : formatMoney(row.revenue)
                        }
                        tone={index === 0 ? "accent" : "mute"}
                      />
                    </DataTableCell>
                    <DataTableCell numeric mono className="text-ink-2">
                      {formatCount(row.orders)}
                    </DataTableCell>
                    <DataTableCell numeric mono className="text-ink-2">
                      {sort === "quantity"
                        ? formatMoney(row.revenue)
                        : formatCount(row.quantity)}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </DataTableScroll>
        ) : null}
      </CardBody>
    </Card>
  );
}
