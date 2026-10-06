/**
 * How far a cart is from its kitchen's minimum order.
 *
 * This is the one sum in the cart the browser does itself, and it is a gap,
 * not a price. Under the minimum POST /orders/quote refuses outright, so there
 * is no server subtotal to read — and "Add ₹3 more" is only useful if it can
 * be said before the customer goes looking. The figure uses the unit prices
 * the menu quoted, which is what the server's own subtotal is built from; the
 * moment the cart clears the minimum the quote answers and its numbers take
 * over again. Paise, not floats, so ₹76.10 + ₹2.90 is ₹79 and not ₹78.99999.
 */
import { toNumber } from "./format";
import type { CartLine } from "./cart";

const PAISE_PER_RUPEE = 100;

export interface MinimumOrderGap {
  /** What the kitchen asks for, in rupees. */
  readonly minimum: number;
  /** The cart's lines at menu prices, in rupees. */
  readonly subtotal: number;
  /** minimum − subtotal, always > 0 when this exists. */
  readonly shortBy: number;
  /** 0–1, how much of the minimum the cart already covers. */
  readonly progress: number;
}

function toPaise(value: string | number | null | undefined): number {
  return Math.round(toNumber(value) * PAISE_PER_RUPEE);
}

/** Null when there is no minimum, it is not known yet, or the cart clears it. */
export function minimumOrderGap(
  lines: readonly CartLine[],
  minimumOrderValue: string | number | null | undefined,
): MinimumOrderGap | null {
  if (minimumOrderValue === null || minimumOrderValue === undefined) return null;
  const minimum = toPaise(minimumOrderValue);
  if (minimum <= 0 || lines.length === 0) return null;
  const subtotal = lines.reduce(
    (sum, line) => sum + toPaise(line.unitPrice) * line.quantity,
    0,
  );
  if (subtotal >= minimum) return null;
  return {
    minimum: minimum / PAISE_PER_RUPEE,
    subtotal: subtotal / PAISE_PER_RUPEE,
    shortBy: (minimum - subtotal) / PAISE_PER_RUPEE,
    progress: subtotal / minimum,
  };
}
