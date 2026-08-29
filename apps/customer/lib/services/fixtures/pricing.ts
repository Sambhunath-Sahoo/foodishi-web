import type { MenuItem, Quote, RestaurantPolicy } from "../../types";

/**
 * What an order costs, mirroring `app/services/pricing.py`.
 *
 * The server is the authority; this exists so the fixture source can answer
 * /orders/quote at all. The two must agree, so the rules are written in the
 * same order with the same rounding: every part is rounded to paise before the
 * total sums them, because the real table has a check constraint
 * (ck_orders_total_reconciles) that a float total would break.
 *
 * There is deliberately no delivery-radius rule and no real distance — saved
 * addresses carry placeholder coordinates, so the promise is a plausible
 * window and the fee is priced off a plausible city distance. Same reasoning,
 * and same numbers, as `app/services/eta.py`.
 */

const TAX_RATE = 0.05;
export const PROMISE_MIN_MINUTES = 15;
export const PROMISE_MAX_MINUTES = 45;
const NOMINAL_MIN_KM = 1;
const NOMINAL_MAX_KM = 8;

/**
 * Two decimals, half-up, as a string. Must agree with `money()` in
 * app/services/money.py, which is `Decimal(value).quantize(Decimal("0.01"),
 * rounding=ROUND_HALF_UP)` — exact decimal arithmetic.
 *
 * The old implementation was
 *   Math.round((amount + Number.EPSILON) * 100) / 100
 * and its comment claimed "money never becomes a float here", which was not
 * true: the value IS a float, and adding EPSILON to the UNSCALED amount does not
 * recover a half that binary floating point already lost. Scanning every
 * 2-decimal subtotal from 1.00 to 20,000.00 through `money(subtotal * 0.05)`,
 * 1,632 disagreed with the server — 164 of them inside the ordinary 300–1500
 * cart range. Worked example: 320.90 * 0.05 is 16.044999999999998 in float, so
 * this returned 16.04 where the server returns 16.05, and because the total is a
 * sum of already-rounded parts the paisa propagated.
 *
 * The fix scales FIRST and rounds the scaled value, correcting the
 * representation error at the scale that matters before the half-up decision:
 * toFixed(4) on the scaled value collapses 1604.4999999999998 to 1604.5000, and
 * Math.round takes .5 upward, which is what half-up means.
 */
export function money(amount: number): string {
  const paise = Math.round(Number((amount * 100).toFixed(4)));
  return (paise / 100).toFixed(2);
}

export function toAmount(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * A stable float in [0, 1) from the given parts.
 *
 * Stable is the point: a wandering number would quote 20 minutes and place 40,
 * and would move the delivery fee between the cart and the checkout screen.
 */
function unitInterval(...parts: readonly (string | number)[]): number {
  const raw = parts.join("|");
  // FNV-1a. Not cryptographic — it only has to spread evenly and never change.
  let hash = 0x811c9dc5;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 0x100000000;
}

export function nominalEtaMinutes(...seed: readonly (string | number)[]): number {
  const span = PROMISE_MAX_MINUTES - PROMISE_MIN_MINUTES;
  return PROMISE_MIN_MINUTES + Math.floor(unitInterval("eta", ...seed) * (span + 1));
}

export function nominalDistanceKm(...seed: readonly (string | number)[]): string {
  const span = NOMINAL_MAX_KM - NOMINAL_MIN_KM;
  return (NOMINAL_MIN_KM + unitInterval("km", ...seed) * span).toFixed(1);
}

export class PricingError extends Error {}

export interface QuoteLineInput {
  readonly item: MenuItem;
  readonly quantity: number;
}

export interface BuildQuoteInput {
  readonly restaurantId: number;
  readonly addressId: number;
  readonly policy: RestaurantPolicy;
  readonly lines: readonly QuoteLineInput[];
  readonly discount: number;
  readonly couponCode: string | null;
  readonly couponMessage: string | null;
  readonly placedAt: Date;
}

export function buildQuote(input: BuildQuoteInput): Quote {
  if (input.lines.length === 0) {
    throw new PricingError("An order must contain at least one item");
  }

  const lines = input.lines.map(({ item, quantity }) => {
    if (quantity <= 0) {
      throw new PricingError(`Quantity for '${item.name}' must be positive`);
    }
    if (!item.is_available) {
      throw new PricingError(`'${item.name}' is currently unavailable`);
    }
    return {
      menu_item_id: item.id,
      item_name: item.name,
      unit_price: money(toAmount(item.price)),
      quantity,
      line_total: money(toAmount(item.price) * quantity),
    };
  });

  const subtotal = toAmount(money(lines.reduce((sum, line) => sum + toAmount(line.line_total), 0)));
  const minOrder = toAmount(input.policy.min_order_value);
  if (subtotal < minOrder) {
    throw new PricingError(
      `Minimum order value for this restaurant is ${money(minOrder)}`,
    );
  }

  const seed = [input.restaurantId, input.addressId] as const;
  const distanceKm = nominalDistanceKm(...seed);
  const etaMinutes = nominalEtaMinutes(...seed);

  const freeAbove = input.policy.free_delivery_above;
  const isFreeDelivery = freeAbove !== null && subtotal >= toAmount(freeAbove);
  const deliveryFee = isFreeDelivery
    ? money(0)
    : money(
        toAmount(input.policy.delivery_fee_base) +
          toAmount(input.policy.delivery_fee_per_km) * toAmount(distanceKm),
      );

  const packagingFee = money(toAmount(input.policy.packaging_fee));
  // Discount FIRST, and the tax base is net of it — mirroring
  // app/services/pricing.py, where GST is charged on what the customer actually
  // pays for the food rather than on the list price. Taxing the undiscounted
  // subtotal overcharged 5% of every coupon. Fees stay outside the base.
  const discountAmount = money(Math.min(input.discount, subtotal));
  const taxAmount = money((subtotal - toAmount(discountAmount)) * TAX_RATE);

  // Sum of already-rounded parts, so the total matches its components exactly.
  const totalAmount = money(
    subtotal +
      toAmount(packagingFee) +
      toAmount(deliveryFee) +
      toAmount(taxAmount) -
      toAmount(discountAmount),
  );

  const placedAt = input.placedAt.getTime();
  const cancellationWindow = input.policy.cancellation_window_mins;

  return {
    lines,
    subtotal: money(subtotal),
    packaging_fee: packagingFee,
    delivery_fee: deliveryFee,
    tax_amount: taxAmount,
    discount_amount: discountAmount,
    total_amount: totalAmount,
    distance_km: distanceKm,
    promised_at: new Date(placedAt + etaMinutes * 60_000).toISOString(),
    cancellable_until: new Date(placedAt + cancellationWindow * 60_000).toISOString(),
    coupon_code: input.couponCode,
    coupon_message: input.couponMessage,
  };
}
