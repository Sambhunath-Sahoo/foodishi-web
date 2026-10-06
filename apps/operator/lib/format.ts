/**
 * Every number the operator reads passes through here. The API sends money as
 * decimal strings ("1960.15") so no float ever touches a rupee amount before
 * it is formatted.
 */
import { formatSpan } from "@repo/ui";

const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const rupeesWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const counts = new Intl.NumberFormat("en-IN");

const clockTime = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateAndTime = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const shortDate = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
});

const dateOnly = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/**
 * Decimal strings from the API, for ARITHMETIC. Anything unparseable reads as 0,
 * never NaN — which is right for a sum or a meter maximum, where NaN would
 * poison the whole calculation.
 *
 * It is NOT right for display: see formatMoney below.
 */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Shown instead of a money figure that cannot be read. Not a number. */
export const UNREADABLE_AMOUNT = "—";

/**
 * A money amount, or a visible dash when it cannot be read.
 *
 * This used to go through toNumber, so a null or malformed `amount` — a partial
 * write, a provider webhook gap, a schema change — rendered as "₹0.00",
 * indistinguishable from a genuine zero-value attempt. On the payments and
 * revenue screens that means an operator reconciling a column silently
 * under-counts, with nothing on screen to notice. The partner console's
 * formatMoney already refuses to invent a number this way; operator's did not.
 *
 * Arithmetic paths keep toNumber. Only DISPLAY changes.
 */
export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return UNREADABLE_AMOUNT;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? rupees.format(parsed) : UNREADABLE_AMOUNT;
}

/**
 * For KPI tiles and axis labels, where two decimals are noise.
 *
 * Refuses an unreadable value the same way formatMoney does. Left on toNumber it
 * printed "₹0" for null on 30-odd stat tiles and the nav badge while the row
 * cells beside them printed "—" — and the tiles are the figures an operator
 * actually reconciles against, so they were the worse half to leave lying.
 */
export function formatMoneyWhole(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return UNREADABLE_AMOUNT;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? rupeesWhole.format(parsed) : UNREADABLE_AMOUNT;
}

export function formatCount(value: number): string {
  return counts.format(value);
}

/** 0.14 -> "14%". The funnel sends rates as fractions. */
export function formatRate(rate: number, fractionDigits = 0): string {
  return `${(rate * 100).toFixed(fractionDigits)}%`;
}

const calendarDay = new Intl.DateTimeFormat("en-IN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * "20:25" for a time today, "21 Aug, 20:25" for any other day.
 *
 * A bare clock used to be all this printed, which is right on an evening's
 * board and wrong the moment an order is older than the evening: an order due
 * "20:25" six weeks ago read exactly like one due in ten minutes (OP-3). The
 * date appears only when it is not today, so the ordinary row stays five
 * characters wide.
 *
 * `nowMs` is the caller's `useNow()` value when it has one, so "today" is the
 * same instant the row's lateness was measured at. Without it the comparison
 * falls back to the wall clock — still correct, just not pinned to the render.
 */
export function formatClock(iso: string, nowMs: number = Date.now()): string {
  const at = new Date(iso);
  const isToday = calendarDay.format(at) === calendarDay.format(new Date(nowMs));
  return isToday ? clockTime.format(at) : dateAndTime.format(at);
}

export function formatDateTime(iso: string): string {
  return dateAndTime.format(new Date(iso));
}

export function formatDay(isoDate: string): string {
  return shortDate.format(new Date(`${isoDate}T00:00:00Z`));
}

/**
 * "12 Mar 2025" from a full timestamp. For the dates where the clock is noise
 * — when an account was opened — and where the year is not, unlike `formatDay`,
 * which labels points on a chart of the last few weeks.
 */
export function formatDateOnly(iso: string): string {
  return dateOnly.format(new Date(iso));
}

/** Whole minutes between two instants; negative means the first is earlier. */
export function minutesBetween(fromMs: number, toMs: number): number {
  return Math.round((toMs - fromMs) / MS_PER_MINUTE);
}

export function hoursBetween(fromMs: number, toMs: number): number {
  return (toMs - fromMs) / MS_PER_HOUR;
}

/** 95 -> "1h 35m". Used for SLA age and lateness, never for a raw count. */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < MINUTES_PER_HOUR) return `${minutes} min`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const remainder = minutes % MINUTES_PER_HOUR;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

/**
 * "42m", "6h 30m", "4d 8h" — an elapsed span that may run to days.
 *
 * Orders are late by hours and use the shared `formatLate`; a breached refund
 * can sit for a week, and "104h 12m" is a number the reader has to divide
 * before they can act on it (DENSITY.md §3).
 */
export function formatElapsed(totalMinutes: number): string {
  return formatSpan(totalMinutes);
}

/**
 * How each payment method reads. Only UPI is an acronym, and "cod" is not a word
 * a support agent should have to translate on a call — `humanizeEnum` turned
 * them into "Upi" and "Cod" (OP-4). Unknown values still get the humanised
 * enum rather than nothing.
 */
const PAYMENT_METHOD_LABEL: Readonly<Record<string, string>> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Netbanking",
  wallet: "Wallet",
  cod: "Cash on delivery",
};

export function formatPaymentMethod(method: string): string {
  return PAYMENT_METHOD_LABEL[method] ?? humanizeEnum(method);
}

/** Order ids are shown as the API's integer, prefixed so they read as ids. */
export function formatOrderRef(orderId: number): string {
  return `#${orderId}`;
}

/** "cancelled_by_user" -> "Cancelled by user". Enum labels, not free text. */
export function humanizeEnum(value: string): string {
  const spaced = value.replaceAll("_", " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
