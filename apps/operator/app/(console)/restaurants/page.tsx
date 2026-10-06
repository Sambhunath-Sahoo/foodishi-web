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
  PageTitle,
  SEVERITY_LABEL,
  SEVERITY_TEXT,
  SeverityCell,
  Stat,
  StatRail,
  TableFooter,
  Thumb,
  Toolbar,
} from "@repo/ui";
import { BoardSkeleton, RailSkeleton } from "../../../components/board-skeleton";
import { QueryState } from "../../../components/query-state";
import { ToolbarHint } from "../../../components/toolbar-hint";
import { RestaurantDrawer } from "../../../components/restaurant-drawer";
import { RowAction } from "../../../components/row-action";
import { SortableHeader } from "../../../components/sortable-header";
import {
  formatCount,
  formatDuration,
  formatMoney,
  formatMoneyWhole,
  formatRate,
  toNumber,
} from "../../../lib/format";
import { DECK_PAGE, DECK_PANEL, DECK_RAIL } from "../../../lib/deck";
import {
  divergenceTier,
  formatAboveTypical,
  gapMinutes,
  gapScale,
  WARN_MINUTES_OVER_MEDIAN,
} from "../../../lib/kitchen-gap";
import { sortRows, toggleSort, type SortState } from "../../../lib/sort";
import {
  useRestaurantDirectory,
  useRestaurantMetrics,
} from "../../../lib/queries";

type Column =
  | "name"
  | "order_count"
  | "revenue"
  | "cancellation_rate"
  | "avg_prep_minutes"
  | "avg_delivery_minutes"
  | "gap";

/** Plain words for the footer — never a column name (DENSITY.md §5, §6). */
const SORTED_BY: Record<Column, string> = {
  name: "kitchen name",
  order_count: "orders taken",
  revenue: "revenue delivered",
  cancellation_rate: "share of orders cancelled",
  avg_prep_minutes: "the prep time the kitchen declares",
  avg_delivery_minutes: "how long an order really takes",
  gap: "how far above the typical overhead each kitchen sits",
};

/** The cover beside a kitchen's name, sized for a 38px row. */
const COVER_PX = 22;

export default function RestaurantsPage(): React.JSX.Element {
  const metrics = useRestaurantMetrics();
  // The metrics row carries neither a photo nor the on/off switch, so both come
  // from the catalogue the rest of the console already has cached.
  const directory = useRestaurantDirectory();
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [sort, setSort] = React.useState<SortState<Column>>({
    key: "gap",
    direction: "desc",
  });

  const handleSort = React.useCallback((key: Column) => {
    setSort((current) => toggleSort(current, key, key === "name" ? "asc" : "desc"));
  }, []);

  return (
    <div className={DECK_PAGE}>
      <PageTitle subtitle="How far each kitchen's real end-to-end time sits above the prep time it promises on.">
        Restaurant performance
      </PageTitle>

      <QueryState
        query={metrics}
        errorTitle="Restaurant performance could not load"
        emptyTitle="No restaurant metrics yet"
        emptyDetail="Each restaurant appears here once it has taken its first order."
        isEmpty={(page) => page.items.length === 0}
        skeleton={
          <>
            <RailSkeleton label="Loading kitchen performance" />
            <BoardSkeleton
              rows={12}
              label="Loading kitchens"
              note="Comparing every kitchen against the typical overhead…"
            />
          </>
        }
      >
        {(page) => {
          const scale = gapScale(page.items);
          const medianGap = scale.medianGap;

          const rows = sortRows(page.items, sort, (row, key) => {
            switch (key) {
              case "name":
                return row.name;
              case "revenue":
                return toNumber(row.revenue);
              case "gap":
                return gapMinutes(row);
              default:
                return row[key];
            }
          });

          const flagged = rows.filter(
            (row) => divergenceTier(gapMinutes(row), scale) > 0,
          ).length;
          const totalOrders = rows.reduce((sum, row) => sum + row.order_count, 0);
          const totalRevenue = rows.reduce(
            (sum, row) => sum + toNumber(row.revenue),
            0,
          );
          const worstCancellation = rows.reduce(
            (peak, row) => Math.max(peak, row.cancellation_rate),
            0,
          );
          // Null until the catalogue lands: a zero here would read as "every
          // kitchen is open", which is a different claim from "not known yet".
          const switchedOff =
            directory.data === undefined
              ? null
              : [...directory.data.values()].filter((place) => !place.is_active).length;

          return (
            <>
              <div className={DECK_RAIL}>
                <StatRail ariaLabel="Kitchen performance">
                  <Stat
                    label="Kitchens"
                    value={formatCount(rows.length)}
                    caption="Taking orders on the platform"
                    hint="Every restaurant that has taken at least one order."
                  />
                  <Stat
                    label="Typical overhead"
                    value={formatDuration(medianGap)}
                    caption="Pickup and the ride, median"
                    hint="How much longer a typical order takes end to end than the kitchen's own declared prep time."
                  />
                  <Stat
                    label="Slipping"
                    value={formatCount(flagged)}
                    tone={flagged > 0 ? "alarm" : "ok"}
                    caption={
                      flagged > 0
                        ? `More than ${formatDuration(WARN_MINUTES_OVER_MEDIAN)} above that`
                        : "Every kitchen is near the median"
                    }
                    hint="These kitchens quote a prep time that no longer matches how long their orders really take, so every promise built on it runs late."
                  />
                  <Stat
                    label="Orders"
                    value={formatCount(totalOrders)}
                    caption="Across every kitchen"
                    hint="Total orders taken, all time."
                  />
                  <Stat
                    label="Revenue"
                    value={formatMoneyWhole(totalRevenue)}
                    caption={`Worst cancellation rate ${formatRate(worstCancellation, 1)}`}
                    hint="Delivered revenue across every kitchen, all time."
                  />
                  <Stat
                    label="Switched off"
                    value={switchedOff === null ? "—" : formatCount(switchedOff)}
                    // Neutral: a closed kitchen is a decision already taken, not
                    // a clock running (OP-7).
                    tone="default"
                    caption="Not taking new orders"
                    hint="Kitchens an operator has closed. They keep their history and still appear in the rows below, because what they did last week is still worth reading."
                  />
                </StatRail>
              </div>

              <Toolbar ariaLabel="Kitchen table filters">
                <ToolbarHint>
                  Every kitchen — sorted, not filtered
                  {flagged > 0
                    ? ` · ${formatCount(flagged)} slipping, more than ${formatDuration(WARN_MINUTES_OVER_MEDIAN)} above the typical overhead`
                    : ""}
                </ToolbarHint>
              </Toolbar>

              <DataTableScroll
                className={DECK_PANEL}
                footer={
                  <TableFooter
                    shown={rows.length}
                    total={page.total}
                    noun="kitchens"
                    sortedBy={SORTED_BY[sort.key]}
                    extra={`typical overhead ${formatDuration(medianGap)}`}
                  />
                }
              >
                <DataTable aria-label="Restaurant performance, sortable">
                  <DataTableHead>
                    <tr>
                      <SortableHeader
                        sortKey="name"
                        sort={sort}
                        onSort={handleSort}
                        className="pl-1"
                      >
                        Kitchen
                      </SortableHeader>
                      <SortableHeader
                        sortKey="order_count"
                        sort={sort}
                        onSort={handleSort}
                        numeric
                      >
                        Orders
                      </SortableHeader>
                      <SortableHeader
                        sortKey="revenue"
                        sort={sort}
                        onSort={handleSort}
                        numeric
                      >
                        Revenue
                      </SortableHeader>
                      <SortableHeader
                        sortKey="cancellation_rate"
                        sort={sort}
                        onSort={handleSort}
                        numeric
                      >
                        Cancelled
                      </SortableHeader>
                      <SortableHeader
                        sortKey="avg_prep_minutes"
                        sort={sort}
                        onSort={handleSort}
                        numeric
                      >
                        Declared prep
                      </SortableHeader>
                      <SortableHeader
                        sortKey="avg_delivery_minutes"
                        sort={sort}
                        onSort={handleSort}
                        numeric
                      >
                        Really takes
                      </SortableHeader>
                      <SortableHeader
                        sortKey="gap"
                        sort={sort}
                        onSort={handleSort}
                        numeric
                      >
                        Above typical
                      </SortableHeader>
                      <DataTableHeaderCell>State</DataTableHeaderCell>
                      <DataTableHeaderCell numeric>Change it</DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {rows.map((row) => {
                      const gap = gapMinutes(row);
                      const tier = divergenceTier(gap, scale);
                      const place = directory.data?.get(row.restaurant_id);

                      return (
                        <DataTableRow
                          key={row.restaurant_id}
                          selected={row.restaurant_id === openId}
                          onClick={() => setOpenId(row.restaurant_id)}
                          className="cursor-pointer"
                        >
                          <SeverityCell
                            tier={tier}
                            title={tier === 0 ? undefined : SEVERITY_LABEL[tier]}
                            className="max-w-[230px] font-medium text-ink"
                          >
                            <span className="flex items-center gap-2">
                              <Thumb
                                src={place?.image_url}
                                name={row.name}
                                size={COVER_PX}
                              />
                              <span className="truncate">{row.name}</span>
                            </span>
                          </SeverityCell>
                          <DataTableCell numeric>
                            {formatCount(row.order_count)}
                          </DataTableCell>
                          <DataTableCell numeric>{formatMoney(row.revenue)}</DataTableCell>
                          <DataTableCell numeric>
                            {formatRate(row.cancellation_rate, 1)}
                          </DataTableCell>
                          <DataTableCell numeric>
                            {formatDuration(row.avg_prep_minutes)}
                          </DataTableCell>
                          <DataTableCell numeric>
                            {row.avg_delivery_minutes === null ? (
                              <span className="text-ink-3">no deliveries yet</span>
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
                          <DataTableCell>
                            {place === undefined ? (
                              <span className="text-ink-4">—</span>
                            ) : place.is_active ? (
                              <Badge tone="ok">Open</Badge>
                            ) : (
                              <Badge tone="mute">Switched off</Badge>
                            )}
                          </DataTableCell>
                          <DataTableCell numeric>
                            <RowAction
                              tone="accent"
                              onClick={() => setOpenId(row.restaurant_id)}
                              title="Correct its details, or stop it taking orders."
                              ariaLabel={`Open ${row.name}`}
                            >
                              Manage
                            </RowAction>
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

      <RestaurantDrawer restaurantId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
