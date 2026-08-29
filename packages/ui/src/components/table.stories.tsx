import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "./table";
import { StatusChip } from "./status-chip";
import { EmptyState } from "./empty-state";
import {
  getOrderStatusTone,
  type OrderStatusOrLate,
} from "../status/order-status";

interface OrderRow {
  readonly id: string;
  readonly restaurant: string;
  readonly dish: string;
  readonly placedAt: string;
  readonly status: OrderStatusOrLate;
  readonly sla: string;
  readonly total: string;
  /**
   * Whether this row needs a human now. Urgency decides *whether* a stripe
   * appears; status/order-status.ts decides which colour it is, so no story
   * ever restates the status → tone mapping.
   */
  readonly isUrgent?: boolean;
}

const ORDER_ROWS: readonly OrderRow[] = [
  {
    id: "ORD-4471",
    restaurant: "Tandoori Nights",
    dish: "Mutton Dum Biryani × 2",
    placedAt: "18:02",
    status: "late",
    sla: "11 min over",
    total: "₹1,248.50",
    isUrgent: true,
  },
  {
    id: "ORD-4470",
    restaurant: "Hyderabadi Dum",
    dish: "Mirchi Ka Salan, Bagara Rice",
    placedAt: "18:09",
    status: "preparing",
    sla: "4 min left",
    total: "₹612.00",
    isUrgent: true,
  },
  {
    id: "ORD-4468",
    restaurant: "Crust & Coal",
    dish: "Paneer Tikka, Garlic Naan × 3",
    placedAt: "17:54",
    status: "out_for_delivery",
    sla: "on time",
    total: "₹899.00",
  },
  {
    id: "ORD-4463",
    restaurant: "Idli Factory",
    dish: "Masala Dosa × 4, Filter Coffee",
    placedAt: "17:41",
    status: "delivered",
    sla: "6 min early",
    total: "₹438.00",
  },
  {
    id: "ORD-4459",
    restaurant: "Tandoori Nights",
    dish: "Mutton Dum Biryani",
    placedAt: "17:33",
    status: "cancelled",
    sla: "—",
    total: "₹0.00",
  },
];

const captionStyle: React.CSSProperties = {
  maxWidth: "68ch",
  margin: "12px 0 0",
  fontFamily: "var(--font-ui)",
  fontSize: "13px",
  lineHeight: 1.5,
  color: "var(--ink-3)",
};

function OrderBoardTable(): React.JSX.Element {
  return (
    <Table aria-label="Live orders">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Order</TableHeaderCell>
          <TableHeaderCell>Restaurant</TableHeaderCell>
          <TableHeaderCell>Items</TableHeaderCell>
          <TableHeaderCell>Placed</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>SLA</TableHeaderCell>
          <TableHeaderCell numeric>Total</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {ORDER_ROWS.map((row) => (
          <TableRow
            key={row.id}
            stripe={row.isUrgent ? getOrderStatusTone(row.status) : undefined}
          >
            <TableCell mono>{row.id}</TableCell>
            <TableCell>{row.restaurant}</TableCell>
            <TableCell>{row.dish}</TableCell>
            <TableCell mono>{row.placedAt}</TableCell>
            <TableCell>
              <StatusChip status={row.status} />
            </TableCell>
            <TableCell>{row.sla}</TableCell>
            <TableCell numeric>{row.total}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const meta = {
  title: "Domain/Table",
  component: Table,
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The operator order board: ids and clock times in IBM Plex Mono, money
 * right-aligned with tabular figures, and a severity stripe down the leading
 * edge of the rows that need a human — crit on ORD-4471 (11 min past its SLA),
 * warn on ORD-4470 (4 min left). The stripe repeats what the chip already says,
 * so the row is legible with the colour removed.
 */
export const OrderBoard: Story = {
  render: () => (
    <div>
      <TableScroll>
        <OrderBoardTable />
      </TableScroll>
      <p style={captionStyle}>
        Late rows carry a 3px severity stripe as well as a chip. Totals are
        right-aligned tabular-nums so ₹1,248.50 and ₹438.00 line up on the
        decimal; order ids and clock times are mono.
      </p>
    </div>
  ),
};

/**
 * The same board clamped to a 360px phone. The table is wider than the frame,
 * so TableScroll scrolls sideways inside its own border and the page body
 * never does (DESIGN.md non-negotiable #4).
 */
export const NarrowViewportScrollsInsideItsContainer: Story = {
  render: () => (
    <div style={{ maxWidth: "360px" }}>
      <TableScroll>
        <OrderBoardTable />
      </TableScroll>
      <p style={captionStyle}>
        360px frame. Drag the table sideways: the scrollbar belongs to the
        bordered container, not to the page.
      </p>
    </div>
  ),
};

/** Nothing to show is still a sentence, not a blank panel. */
export const NoRows: Story = {
  render: () => (
    <TableScroll>
      <Table aria-label="Live orders">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Order</TableHeaderCell>
            <TableHeaderCell>Restaurant</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell numeric>Total</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell colSpan={4}>
              <EmptyState
                title="No live orders — every order placed today has been delivered"
                detail="New orders from Tandoori Nights, Hyderabadi Dum, Crust & Coal and Idli Factory appear here the moment payment is captured."
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableScroll>
  ),
};
