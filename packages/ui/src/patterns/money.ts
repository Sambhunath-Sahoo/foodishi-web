const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹1,248.50 — always two decimals so a column of money stays aligned. */
export function formatInr(amount: number): string {
  return INR.format(amount);
}

/** −₹274.00 for a discount line; the sign is part of the reading. */
export function formatInrNegative(amount: number): string {
  return `−${INR.format(Math.abs(amount))}`;
}

const INR_WHOLE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * ₹105 for prose and button labels, ₹105.50 when there really are paise.
 * A column of money still uses formatInr — this is for a sentence.
 */
export function formatInrCompact(amount: number): string {
  return Number.isInteger(amount) ? INR_WHOLE.format(amount) : INR.format(amount);
}
