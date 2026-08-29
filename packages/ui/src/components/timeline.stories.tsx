import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Timeline, type TimelineEntry } from "./timeline";
import { getOrderStatusTone } from "../status/order-status";
import type { Tone } from "../status/tone";

/**
 * A step the order has not reached yet is muted whatever its status will
 * eventually be tinted: the dot says "not yet", not "out for delivery".
 */
const PENDING_STEP_TONE: Tone = "mute";

/** A refund settling is not an OrderStatus — it is its own success. */
const SETTLED_TONE: Tone = "ok";

/** ORD-4471, Tandoori Nights — Mutton Dum Biryani × 2, ₹1,248.50. */
const ORDER_LIFECYCLE: readonly TimelineEntry[] = [
  {
    id: "placed",
    label: "Order placed",
    timestamp: "18:02",
    actor: "customer",
    detail: "Mutton Dum Biryani × 2 · ₹1,248.50 · paid by UPI",
    tone: getOrderStatusTone("pending"),
  },
  {
    id: "confirmed",
    label: "Confirmed",
    timestamp: "18:04",
    actor: "Tandoori Nights",
    detail: "Promised in 35 min — due 18:39.",
    tone: getOrderStatusTone("confirmed"),
  },
  {
    id: "preparing",
    label: "Preparing",
    timestamp: "18:09",
    actor: "Tandoori Nights",
    detail: "Dum sealed; the biryani cannot be cancelled free of charge now.",
    tone: getOrderStatusTone("preparing"),
  },
  {
    id: "out_for_delivery",
    label: "Out for delivery",
    detail: "Pending — waiting on a rider at the pickup counter.",
    tone: PENDING_STEP_TONE,
  },
];

const CANCELLED_LIFECYCLE: readonly TimelineEntry[] = [
  {
    id: "placed",
    label: "Order placed",
    timestamp: "17:28",
    actor: "customer",
    detail: "Masala Dosa × 4, Filter Coffee · ₹438.00",
    tone: getOrderStatusTone("pending"),
  },
  {
    id: "confirmed",
    label: "Confirmed",
    timestamp: "17:31",
    actor: "Idli Factory",
    tone: getOrderStatusTone("confirmed"),
  },
  {
    id: "cancelled",
    label: "Cancelled by restaurant",
    timestamp: "17:36",
    actor: "Idli Factory",
    detail: "Reason given: \"Dosa griddle down; cannot serve before 19:00\".",
    tone: getOrderStatusTone("cancelled"),
  },
  {
    id: "refunded",
    label: "Refunded in full",
    timestamp: "17:36",
    actor: "system",
    detail: "₹438.00 to UPI · ref pay_Qk18ZrM2v · no cancellation fee applied.",
    tone: SETTLED_TONE,
  },
];

const meta = {
  title: "Domain/Timeline",
  component: Timeline,
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The real lifecycle of ORD-4471: placed by the customer at 18:02, confirmed by
 * Tandoori Nights at 18:04, preparing from 18:09, and out for delivery still
 * pending — so it carries no timestamp, only a muted dot.
 */
export const OrderLifecycle: Story = {
  args: { entries: ORDER_LIFECYCLE },
};

/** A restaurant cancellation, with the reason the API returned and the refund. */
export const CancelledByRestaurant: Story = {
  args: { entries: CANCELLED_LIFECYCLE },
};

/** The first event, seconds after checkout. */
export const JustPlaced: Story = {
  args: { entries: [ORDER_LIFECYCLE[0] as TimelineEntry] },
};
