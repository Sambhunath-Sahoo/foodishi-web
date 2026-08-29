import type { CouponValidation } from "../../types";
import { money, toAmount } from "./pricing";

import couponsSeed from "./data/coupons.json";

/**
 * Coupon rules, mirroring `app/services/coupons.py`.
 *
 * A percent discount is capped by `max_discount` and by the subtotal; a flat
 * one only by the subtotal. A refusal returns the server's own sentence —
 * "Order must be at least 249.00 to use this coupon" tells the customer what
 * to do next, where "invalid coupon" does not.
 */

export interface CouponSeed {
  readonly code: string;
  readonly description: string;
  readonly discount_type: "flat" | "percent";
  readonly discount_value: string;
  readonly min_order_value: string;
  readonly max_discount: string | null;
  readonly is_active: boolean;
}

const COUPONS = couponsSeed as readonly CouponSeed[];

export function findCoupon(code: string): CouponSeed | null {
  const wanted = code.trim().toUpperCase();
  return COUPONS.find((coupon) => coupon.code.toUpperCase() === wanted) ?? null;
}

export function discountFor(coupon: CouponSeed, subtotal: number): number {
  if (coupon.discount_type === "flat") {
    return Math.min(toAmount(coupon.discount_value), subtotal);
  }
  const raw = (subtotal * toAmount(coupon.discount_value)) / 100;
  const cap = coupon.max_discount === null ? raw : toAmount(coupon.max_discount);
  return Math.min(raw, cap, subtotal);
}

/** The reason a coupon cannot be used, or null when it can. */
export function refuseCoupon(coupon: CouponSeed | null, subtotal: number): string | null {
  if (coupon === null) return "That coupon code does not exist";
  if (!coupon.is_active) return "That coupon is no longer active";
  const minimum = toAmount(coupon.min_order_value);
  if (subtotal < minimum) {
    return `Order must be at least ${money(minimum)} to use this coupon`;
  }
  return null;
}

/** What POST /coupons/validate answers. */
export function validate(code: string, subtotal: number): CouponValidation {
  const coupon = findCoupon(code);
  const refusal = refuseCoupon(coupon, subtotal);
  if (refusal !== null || coupon === null) {
    return { applicable: false, discount: money(0), reason: refusal };
  }
  return {
    applicable: true,
    discount: money(discountFor(coupon, subtotal)),
    // `reason` explains a refusal; an applicable coupon has none.
    reason: null,
  };
}
