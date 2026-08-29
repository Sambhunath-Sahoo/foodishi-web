/**
 * Rupee arithmetic for the fixture source.
 *
 * The API sends money as decimal strings and this layer answers in the same
 * shape, so every sum in between is counted in paise as an integer. Adding
 * "1960.15" to "204.90" as floats and formatting the result is how a commission
 * total ends up a paisa short of the rows above it — and a finance screen that
 * does not add up is worse than no finance screen.
 */
const PAISE_PER_RUPEE = 100;

/** "1960.15" -> 196015. Anything unreadable counts as nothing, never NaN. */
export function toPaise(value: string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * PAISE_PER_RUPEE) : 0;
}

/** 196015 -> "1960.15". The only place a rupee string is built. */
export function toRupees(paise: number): string {
  return (Math.round(paise) / PAISE_PER_RUPEE).toFixed(2);
}

export function sumPaise<T>(rows: readonly T[], select: (row: T) => string): number {
  return rows.reduce((total, row) => total + toPaise(select(row)), 0);
}

/** A percentage of an amount, rounded to the paisa. */
export function percentOfPaise(paise: number, percent: number): number {
  return Math.round((paise * percent) / 100);
}

/** The mean, or zero when there is nothing to divide by. */
export function meanPaise(total: number, count: number): number {
  return count === 0 ? 0 : Math.round(total / count);
}
