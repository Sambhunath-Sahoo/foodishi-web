import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  SeverityCell,
  TableFooter,
} from "./data-table";
import { StatusChip } from "./status-chip";
import { EmptyState } from "./empty-state";
import { formatLate, lateTier, SEVERITY_TEXT } from "../status/severity";
import type { OrderStatusOrLate } from "../status/order-status";
import { PAIR_GLOBALS, ThemePair } from "../stories/theme-pair";

interface BoardRow {
  readonly id: string;
  readonly restaurant: string;
  readonly customer: string;
  readonly placed: string;
  readonly status: OrderStatusOrLate;
  /** Minutes past the promised time. Negative or zero means on time. */
  readonly minutesLate: number;
  readonly total: string;
}

/** Eight of the 125 live orders, sorted by minutes past promised. */
const ROWS: readonly BoardRow[] = [
  {
    id: "ORD-3811",
    restaurant: "Chettinad House",
    customer: "Lakshmi Reddy",
    placed: "07:12",
    status: "preparing",
    minutesLate: 697,
    total: "₹1,940.00",
  },
  {
    id: "ORD-3907",
    restaurant: "Hyderabadi Dum",
    customer: "Arjun Nair",
    placed: "07:48",
    status: "confirmed",
    minutesLate: 671,
    total: "₹612.00",
  },
  {
    id: "ORD-4318",
    restaurant: "Tandoori Nights",
    customer: "Meera Joshi",
    placed: "12:26",
    status: "out_for_delivery",
    minutesLate: 392,
    total: "₹1,248.50",
  },
  {
    id: "ORD-4402",
    restaurant: "Coastal Kappa",
    customer: "Rohan Pillai",
    placed: "17:27",
    status: "late",
    minutesLate: 91,
    total: "₹864.00",
  },
  {
    id: "ORD-4471",
    restaurant: "Tandoori Nights",
    customer: "Divya Menon",
    placed: "18:02",
    status: "late",
    minutesLate: 43,
    total: "₹1,105.00",
  },
  {
    id: "ORD-4478",
    restaurant: "Crust & Coal",
    customer: "Sanjay Iyer",
    placed: "18:14",
    status: "preparing",
    minutesLate: 12,
    total: "₹738.00",
  },
  {
    id: "ORD-4483",
    restaurant: "Idli Factory",
    customer: "Nisha Varma",
    placed: "18:29",
    status: "out_for_delivery",
    minutesLate: 0,
    total: "₹438.00",
  },
  {
    id: "ORD-4489",
    restaurant: "Hyderabadi Dum",
    customer: "Kabir Shah",
    placed: "18:41",
    status: "confirmed",
    minutesLate: 0,
    total: "₹1,562.25",
  },
];

function LiveBoard({ maxHeight }: { readonly maxHeight?: number }): React.JSX.Element {
  return (
    <DataTableScroll
      maxHeight={maxHeight}
      footer={
        <TableFooter
          shown={ROWS.length}
          total={125}
          noun="live orders"
          sortedBy="minutes past promised"
          updated="updated 3s ago"
        />
      }
    >
      <DataTable aria-label="Live orders">
        <DataTableHead>
          <DataTableRow>
            <DataTableHeaderCell>Order</DataTableHeaderCell>
            <DataTableHeaderCell>Restaurant</DataTableHeaderCell>
            <DataTableHeaderCell>Customer</DataTableHeaderCell>
            <DataTableHeaderCell>Placed</DataTableHeaderCell>
            <DataTableHeaderCell>Status</DataTableHeaderCell>
            <DataTableHeaderCell>Past promised</DataTableHeaderCell>
            <DataTableHeaderCell numeric>Total</DataTableHeaderCell>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {ROWS.map((row) => {
            const tier = lateTier(row.minutesLate);
            return (
              <DataTableRow key={row.id}>
                <SeverityCell tier={tier} mono>
                  {row.id}
                </SeverityCell>
                <DataTableCell>{row.restaurant}</DataTableCell>
                <DataTableCell>{row.customer}</DataTableCell>
                <DataTableCell mono>{row.placed}</DataTableCell>
                <DataTableCell>
                  <StatusChip status={row.status} />
                </DataTableCell>
                <DataTableCell className={SEVERITY_TEXT[tier]}>
                  {formatLate(row.minutesLate)}
                </DataTableCell>
                <DataTableCell numeric>{row.total}</DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </DataTableScroll>
  );
}

const meta = {
  title: "Command Deck/DataTable",
  component: DataTable,
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const note: React.CSSProperties = {
  maxWidth: "76ch",
  margin: "12px 0 0",
  fontFamily: "var(--font-ui)",
  fontSize: "13px",
  lineHeight: 1.5,
  color: "var(--ink-3)",
};

/** Eight live orders in 38px rows, graded, with a footer that states the shape. */
export const OperatorLiveBoard: Story = {
  render: () => (
    <div>
      <LiveBoard />
      <p style={note}>
        Eight rows in the height four cards used to take. Ids and clock times in
        mono, totals right-aligned on tabular figures, a 3px stripe inset 5px on
        the leading cell, and lateness written as{" "}
        <code>11h 37m</code> rather than <code>697 min</code>.
      </p>
    </div>
  ),
};

/** With a height cap, the header sticks while the body scrolls under it. */
export const StickyHeader: Story = {
  render: () => (
    <div>
      <LiveBoard maxHeight={160} />
      <p style={note}>
        Scroll the body: the 10px uppercase header stays put on{" "}
        <code>--surface-2</code>.
      </p>
    </div>
  ),
};

/** A 390px phone. The table scrolls in its own container, never the page. */
export const NarrowViewportScrolls: Story = {
  render: () => (
    <div style={{ maxWidth: "390px" }}>
      <LiveBoard />
    </div>
  ),
};

/** Nothing to show is still a sentence. */
export const NoRows: Story = {
  render: () => (
    <DataTableScroll
      footer={<TableFooter shown={0} total={0} noun="live orders" sortedBy="minutes past promised" />}
    >
      <DataTable aria-label="Live orders">
        <DataTableHead>
          <DataTableRow>
            <DataTableHeaderCell>Order</DataTableHeaderCell>
            <DataTableHeaderCell>Restaurant</DataTableHeaderCell>
            <DataTableHeaderCell>Status</DataTableHeaderCell>
            <DataTableHeaderCell numeric>Total</DataTableHeaderCell>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          <DataTableRow className="h-auto hover:bg-transparent">
            <DataTableCell colSpan={4} wrap className="py-4">
              <EmptyState
                title="No live orders — every order placed today has been delivered"
                detail="New orders appear here the moment payment is captured."
              />
            </DataTableCell>
          </DataTableRow>
        </DataTableBody>
      </DataTable>
    </DataTableScroll>
  ),
};

/** Both grounds. */
export const BothThemes: Story = {
  globals: PAIR_GLOBALS,
  render: () => (
    <ThemePair stacked>
      <LiveBoard />
    </ThemePair>
  ),
};
