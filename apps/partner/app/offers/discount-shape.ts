/**
 * How a discount is described, in one place.
 *
 * Offers and coupons carry the same three-way `kind`/`value`/`max_discount`
 * shape, and both a table cell and a dialog have to say what it means. Written
 * once here so a coupon and an offer worth the same thing never read
 * differently.
 */
import { formatMoney, formatPercentPoints } from "../_lib/format";
import type { OfferKind } from "../../lib/types";

export const KIND_OPTIONS: readonly {
  readonly value: OfferKind;
  readonly label: string;
}[] = [
  { value: "percent", label: "Percentage off" },
  { value: "flat", label: "Rupees off" },
  { value: "free_delivery", label: "Free delivery" },
];

/** "20% off, up to ₹120" · "₹75 off" · "Delivery waived". */
export function describeDiscount(
  kind: OfferKind,
  value: string,
  maxDiscount: string | null,
): string {
  if (kind === "free_delivery") return "Delivery waived";
  if (kind === "flat") return `${formatMoney(value)} off`;
  const capped = maxDiscount === null ? "" : `, up to ${formatMoney(maxDiscount)}`;
  return `${formatPercentPoints(value)} off${capped}`;
}

/**
 * Whether the thing is actually working right now, which is not the same as
 * `is_active`.
 *
 * A switched-on offer whose window closed last week is off in every way a
 * customer can tell, and drawing it as "Live" is the one lie this screen could
 * tell a manager wondering why nobody is using it.
 */
export type Standing = "live" | "scheduled" | "ended" | "off";

export function readStanding(
  isActive: boolean,
  startsAt: string,
  endsAt: string | null,
  now: number,
): Standing {
  if (!isActive) return "off";
  if (new Date(startsAt).getTime() > now) return "scheduled";
  if (endsAt !== null && new Date(endsAt).getTime() < now) return "ended";
  return "live";
}

export const STANDING_LABELS: Readonly<Record<Standing, string>> = {
  live: "Live",
  scheduled: "Scheduled",
  ended: "Window closed",
  off: "Switched off",
};

export const STANDING_TONES: Readonly<Record<Standing, "ok" | "warn" | "mute">> = {
  live: "ok",
  scheduled: "warn",
  ended: "mute",
  off: "mute",
};

/** An `<input type="datetime-local">` wants "2026-08-21T20:05". */
export function toDateTimeInput(iso: string | null): string {
  if (iso === null) return "";
  const at = new Date(iso);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/** …and gives back local time, which has to become a real instant. */
export function fromDateTimeInput(value: string): string | null {
  if (value.trim() === "") return null;
  return new Date(value).toISOString();
}
