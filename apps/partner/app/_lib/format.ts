/**
 * Every number, clock face and date this console shows passes through here, so
 * no two screens spell the same quantity two ways.
 *
 * Money arrives as a decimal *string* ("1180.00"). It is parsed for display
 * only — never for arithmetic the source has already done.
 */
import { formatSpan } from "@repo/ui";

const RUPEES = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * The same money without the paise, for a rail cell or an axis label where two
 * decimal places are three characters of noise. Never on a receipt, a
 * settlement or anything somebody reconciles.
 */
const RUPEES_ROUND = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const CLOCK = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DAY = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

const DAY_WITH_WEEKDAY = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const MS_PER_MINUTE = 60_000;
const PERCENT = new Intl.NumberFormat("en-IN", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function formatMoney(amount: string | number): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return String(amount);
  return RUPEES.format(value);
}

export function formatMoneyRound(amount: string | number): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return String(amount);
  return RUPEES_ROUND.format(value);
}

/** A signed amount, with the sign kept: a deduction has to look like one. */
export function formatSignedMoney(amount: string | number): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return String(amount);
  return value < 0 ? `−${RUPEES.format(Math.abs(value))}` : RUPEES.format(value);
}

export function sumMoney(amounts: readonly string[]): number {
  return amounts.reduce((total, amount) => {
    const value = Number(amount);
    return Number.isFinite(value) ? total + value : total;
  }, 0);
}

/**
 * 20:05 — a wall clock, in the tablet's own timezone — but only for today.
 *
 * Any other day reads "21 Aug, 20:05". A bare "20:26" on a ticket from six
 * weeks ago reads as this evening, which is how a 44-day-old order passed for
 * a live one. `now` defaults to the render instant; pass the ticking clock
 * where a screen already has one so a page left open past midnight re-dates.
 */
export function formatClock(iso: string, now: number = Date.now()): string {
  const at = new Date(iso);
  const clock = CLOCK.format(at);
  if (Number.isNaN(at.getTime()) || isSameLocalDay(at.getTime(), now)) return clock;
  return `${DAY.format(at)}, ${clock}`;
}

function isSameLocalDay(left: number, right: number): boolean {
  return toLocalDate(left) === toLocalDate(right);
}

/** "21 Aug" — for an axis, a period, a settlement window. */
export function formatDay(iso: string): string {
  return DAY.format(new Date(iso.length === 10 ? `${iso}T00:00:00` : iso));
}

/** "Fri 21 Aug" — where the day of the week is what somebody is looking for. */
export function formatDayWithWeekday(iso: string): string {
  return DAY_WITH_WEEKDAY.format(new Date(iso.length === 10 ? `${iso}T00:00:00` : iso));
}

/** "21 Aug 20:05" — a ledger line, where the day matters as much as the time. */
export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

/** A rate as it was measured. 0.94 -> "94%". */
export function formatPercent(rate: number): string {
  return Number.isFinite(rate) ? PERCENT.format(rate) : "—";
}

/** A stored percentage column, which is already out of a hundred. "18.00" -> "18%". */
export function formatPercentPoints(points: string | number): string {
  const value = typeof points === "number" ? points : Number(points);
  if (!Number.isFinite(value)) return String(points);
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

/** Whole minutes from `iso` to `now`; negative means `iso` is still ahead. */
export function minutesSince(iso: string, now: number): number {
  return Math.floor((now - new Date(iso).getTime()) / MS_PER_MINUTE);
}

/** Whole minutes from `now` to `iso`; negative means `iso` has passed. */
export function minutesUntil(iso: string, now: number): number {
  return Math.ceil((new Date(iso).getTime() - now) / MS_PER_MINUTE);
}

/**
 * "under a minute", "6m", "1h 12m" — one house style for every span on this
 * tablet, matching @repo/ui's `formatLate` so "13h 18m waiting" and "12h 24m
 * late" are never spelled two different ways on the same card.
 */
export function formatDuration(minutes: number): string {
  const whole = Math.max(Math.abs(minutes), 0);
  if (whole < 1) return "under a minute";
  return formatSpan(whole);
}

/** The local calendar day an instant falls on, as "2026-08-21". */
export function toLocalDate(at: number | string): string {
  const date = typeof at === "number" ? new Date(at) : new Date(at);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A local calendar day `days` before today. */
export function daysAgoDate(days: number, now: number): string {
  const at = new Date(now);
  at.setHours(0, 0, 0, 0);
  at.setDate(at.getDate() - days);
  return toLocalDate(at.getTime());
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

/** "1 dish" / "4 dishes", so no call site has to hand-pluralise. */
export function pluralise(count: number, one: string, many: string): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}

/**
 * "4.6 ★ · 7 ratings" — one spelling for the dashboard and Reports, which used
 * to say "4.6 · 7" and "4.6 from 7" about the same two numbers. With no ratings
 * the average is meaningless, so it is not shown at all.
 */
export function formatRating(rating: string | number, count: number): string {
  if (count === 0) return "No ratings yet";
  return `${rating} ★ · ${pluralise(count, "rating", "ratings")}`;
}
