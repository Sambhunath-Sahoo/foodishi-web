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

/**
 * Indian digit grouping: 5,348.45 and 1,23,456.00 — thousands, then lakhs.
 * `toFixed` printed "₹5348.45", which a customer has to count the digits of.
 * Pinned to en-IN rather than the browser's locale, because the grouping is a
 * fact about rupees, not about the reader: en-US would print 123,456.00. The
 * ₹ stays our own prefix (not style: "currency") so it is the same glyph, with
 * no locale-dependent gap, everywhere it already appeared.
 */
const INR_PAISE = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const INR_WHOLE = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** The sign goes before the ₹ ("-₹40.00"), never between it and the digits. */
function withSign(amount: number, digits: Intl.NumberFormat): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${RUPEE}${digits.format(Math.abs(amount))}`;
}

/** "466.00" -> "₹466.00", "5348.45" -> "₹5,348.45". Always two decimals: a price is not a round number. */
export function formatMoney(value: string | number | null | undefined): string {
  return withSign(toNumber(value), INR_PAISE);
}

/** For a button label, where "₹105" reads better than "₹105.00". */
export function formatMoneyShort(value: string | number | null | undefined): string {
  const amount = toNumber(value);
  return withSign(amount, Number.isInteger(amount) ? INR_WHOLE : INR_PAISE);
}

/**
 * Puts the ₹ back on bare amounts in a server sentence: "Minimum order value
 * for this restaurant is 79.00" -> "… is ₹79.00". The API writes money without
 * a currency (AD-4); the sentence itself is still shown verbatim, because it
 * names the thing to fix (DESIGN.md copy rules). Only two-decimal figures are
 * touched — that is how the API writes money, and a distance or a count is
 * never written that way — and one already carrying ₹ is left alone.
 */
export function withRupee(message: string): string {
  // Through formatMoney, so "1000.00" in a server sentence groups like every
  // other amount on the screen ("₹1,000.00").
  return message.replace(
    /(^|[^₹\d.,])(\d+\.\d{2})(?![\d.])/g,
    (_match, lead: string, amount: string) => `${lead}${formatMoney(amount)}`,
  );
}

export function formatRating(value: string | number): string {
  return toNumber(value).toFixed(1);
}

/**
 * What a kitchen's rating should *say*. A kitchen nobody has rated yet carries
 * rating 0.0 in the API, and "★ 0.0" beside it reads as the worst score on the
 * page rather than the absence of one — so it reads "New" instead.
 *
 * The count is optional because saved favourites only kept the average. Stars
 * run 1-5, so an average of exactly 0 can only mean no ratings either way.
 */
export function isUnrated(
  rating: string | number,
  ratingCount?: number,
): boolean {
  return ratingCount === 0 || toNumber(rating) === 0;
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

/**
 * "22:09, 21 Aug" — the clock first, then the day. For a promise that is old
 * enough that the time alone is ambiguous: "promised by 22:09" on an order
 * from six weeks ago reads as tonight.
 */
export function formatClockAndDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const clock = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = date.getDate();
  const month = date.toLocaleDateString(undefined, { month: "short" });
  return `${clock}, ${String(day)} ${month}`;
}

/**
 * "25.00" -> "25%", "12.50" -> "12.5%". The API sends a percentage as a
 * two-decimal string, and "25.00%" reads like a figure off a spreadsheet.
 */
export function formatPercent(value: string | number | null | undefined): string {
  return `${String(Number(toNumber(value).toFixed(2)))}%`;
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
