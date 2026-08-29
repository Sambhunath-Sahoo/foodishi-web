/**
 * Decimal-string arithmetic for the fixture source.
 *
 * The API sends and takes money as a decimal string, and the fixtures have to
 * be able to add a day of orders up. Doing that in floats and printing the
 * result is how a settlement ends up reading ₹18,204.999999999996, so every sum
 * here rounds to paise at the end and comes back out as a string.
 *
 * Only the fixture source uses this. Screens never do arithmetic on money —
 * they format what a service handed them.
 */
const PAISE = 100;

function toPaise(amount: string | number): number {
  const value = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(value) ? Math.round(value * PAISE) : 0;
}

function fromPaise(paise: number): string {
  return (Math.round(paise) / PAISE).toFixed(2);
}

export function sum(amounts: readonly (string | number)[]): string {
  return fromPaise(amounts.reduce<number>((total, one) => total + toPaise(one), 0));
}

/** A share of an amount, rounded to paise. `percent` is "18.00", not 0.18. */
export function percentOf(amount: string | number, percent: string | number): string {
  const rate = typeof percent === "number" ? percent : Number(percent);
  return fromPaise((toPaise(amount) * (Number.isFinite(rate) ? rate : 0)) / 100);
}

export function subtract(left: string | number, right: string | number): string {
  return fromPaise(toPaise(left) - toPaise(right));
}

export function divide(amount: string | number, count: number): string {
  return count <= 0 ? "0.00" : fromPaise(toPaise(amount) / count);
}
