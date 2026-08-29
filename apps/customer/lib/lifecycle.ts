/**
 * The six states an order walks through, in the order the customer sees them.
 * `cancelled` is deliberately absent: it leaves the line rather than sitting
 * on it, so the stepper is replaced when an order is cancelled.
 */
import type { OrderStatus } from "./types";

export interface LifecycleStep {
  readonly status: Exclude<OrderStatus, "cancelled">;
  /** Written from the customer's side of the counter, not the kitchen's. */
  readonly label: string;
  readonly done: string;
}

export const LIFECYCLE: readonly LifecycleStep[] = [
  { status: "pending", label: "Placed", done: "Order placed" },
  { status: "confirmed", label: "Confirmed", done: "Kitchen accepted it" },
  { status: "preparing", label: "Cooking", done: "Cooking started" },
  { status: "ready_for_pickup", label: "Ready", done: "Ready for pickup" },
  { status: "out_for_delivery", label: "On the way", done: "Out for delivery" },
  { status: "delivered", label: "Delivered", done: "Delivered" },
];

/** How far along the line an order is; -1 for a status not on the line. */
export function lifecycleIndex(status: string): number {
  return LIFECYCLE.findIndex((step) => step.status === status);
}

/** Delivered and cancelled never change again — stop polling them. */
export function isSettled(status: string | undefined): boolean {
  return status === "delivered" || status === "cancelled";
}

/** One line telling the customer what is happening right now. */
export function lifecycleHeadline(status: string, isLate: boolean): string {
  if (status === "cancelled") return "This order was cancelled";
  if (status === "delivered") return "Delivered — enjoy";
  if (isLate) return "Running late — the kitchen is still on it";
  const step = LIFECYCLE.find((entry) => entry.status === status);
  return step === undefined ? "Tracking this order" : step.done;
}
