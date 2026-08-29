/**
 * The API sends money as decimal *strings* ("466.00") so nothing is lost to a
 * float on the way. Parse late, format once, never do arithmetic on the
 * rendered string.
 */
const RUPEE = "₹";
const MINUTES_PER_HOUR = 60;

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** "466.00" -> "₹466.00". Always two decimals: a price is not a round number. */
export function formatMoney(value: string | number | null | undefined): string {
  return `${RUPEE}${toNumber(value).toFixed(2)}`;
}

/** For a button label, where "₹105" reads better than "₹105.00". */
export function formatMoneyShort(value: string | number | null | undefined): string {
  const amount = toNumber(value);
  const isWhole = Number.isInteger(amount);
  return `${RUPEE}${isWhole ? amount.toFixed(0) : amount.toFixed(2)}`;
}

export function formatRating(value: string | number): string {
  return toNumber(value).toFixed(1);
}

export function formatDistance(km: string | number): string {
  return `${toNumber(km).toFixed(1)} km`;
}

/** "07:00:00" -> "7:00 am". The API sends a bare time, not a datetime. */
export function formatClock(time: string): string {
  const [rawHour, rawMinute] = time.split(":");
  const hour = Number.parseInt(rawHour ?? "", 10);
  const minute = rawMinute ?? "00";
  if (!Number.isFinite(hour)) return time;
  const suffix = hour < 12 ? "am" : "pm";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minute} ${suffix}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeOnly(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** 95 -> "1h 35m". Used for a countdown, so it never renders a bare "0". */
export function formatMinutes(minutes: number): string {
  const safe = Math.max(minutes, 0);
  if (safe < MINUTES_PER_HOUR) return `${safe} min`;
  const hours = Math.floor(safe / MINUTES_PER_HOUR);
  const rest = safe % MINUTES_PER_HOUR;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** mm:ss, for the live countdown to promised_at. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(Math.floor(totalSeconds), 0);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** A restaurant's own opening hours, wrapped past midnight or not. */
export function isOpenNow(opensAt: string, closesAt: string, now = new Date()): boolean {
  const minutesNow = now.getUTCHours() * MINUTES_PER_HOUR + now.getUTCMinutes();
  const open = clockToMinutes(opensAt);
  const close = clockToMinutes(closesAt);
  if (open === null || close === null) return true;
  return close > open
    ? minutesNow >= open && minutesNow < close
    : minutesNow >= open || minutesNow < close;
}

function clockToMinutes(time: string): number | null {
  const [rawHour, rawMinute] = time.split(":");
  const hour = Number.parseInt(rawHour ?? "", 10);
  const minute = Number.parseInt(rawMinute ?? "", 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * MINUTES_PER_HOUR + minute;
}
