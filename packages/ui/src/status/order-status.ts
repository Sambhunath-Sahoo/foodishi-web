import type { Tone } from "./tone";

/**
 * The seven OrderStatus values the API emits (app/models/enums.py), plus the
 * derived "late" flag the operator board applies to an order past its SLA.
 *
 * No app picks a colour per status. It asks here.
 */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** "late" is not a status the API stores — it is derived from the SLA. */
export type OrderStatusOrLate = OrderStatus | "late";

interface StatusPresentation {
  readonly tone: Tone;
  readonly label: string;
}

const ORDER_STATUS_PRESENTATION: Record<OrderStatusOrLate, StatusPresentation> =
  {
    pending: { tone: "mute", label: "Pending" },
    confirmed: { tone: "accent", label: "Confirmed" },
    preparing: { tone: "warn", label: "Preparing" },
    ready_for_pickup: { tone: "accent", label: "Ready for pickup" },
    out_for_delivery: { tone: "cool", label: "Out for delivery" },
    delivered: { tone: "ok", label: "Delivered" },
    cancelled: { tone: "crit", label: "Cancelled" },
    late: { tone: "crit", label: "Late" },
  };

const UNKNOWN_STATUS: StatusPresentation = { tone: "mute", label: "Unknown" };

/**
 * Never trust the wire: a status the client has not been taught yet degrades
 * to a muted "Unknown" chip rather than throwing inside a table row.
 */
export function getOrderStatusPresentation(
  status: string,
): StatusPresentation {
  return ORDER_STATUS_PRESENTATION[status as OrderStatusOrLate] ?? UNKNOWN_STATUS;
}

export function getOrderStatusTone(status: string): Tone {
  return getOrderStatusPresentation(status).tone;
}

export function getOrderStatusLabel(status: string): string {
  return getOrderStatusPresentation(status).label;
}
