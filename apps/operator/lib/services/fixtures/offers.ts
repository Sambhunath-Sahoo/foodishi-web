import type { CouponRead } from "../../api-types";
import type { CouponInput, CouponPatch, OffersService } from "../types";
import { NotFoundError, settle, settleWrite, UnprocessableError } from "./latency";
import { toWholePage } from "./paging";
import { addCoupon, allCoupons, findCoupon, findRestaurant, patchCoupon } from "./store";

/**
 * Coupons and platform-wide offers, which are the same record with a different
 * scope: `global` is the whole platform, `restaurant` is one kitchen's own code,
 * `cuisine` is a category promotion. Three screens' worth of concepts, one row.
 *
 * The validation below is the interesting part. Every rule here is one an
 * operator can get wrong in a way that costs real money — a percentage discount
 * with no cap, a window that ends before it starts, a code that undercuts the
 * minimum order it requires — so each is refused with the sentence that says
 * what to change, and none of them lives in the form.
 */

const MAX_CODE_LENGTH = 24;
const CODE_PATTERN = /^[A-Z0-9]+$/;
const FULL_PERCENT = 100;

function requireCoupon(couponId: number): CouponRead {
  const coupon = findCoupon(couponId);
  if (coupon === null) {
    throw new NotFoundError(`No coupon with id ${String(couponId)}.`);
  }
  return coupon;
}

/** Uppercase and trimmed: codes are typed by customers, not by us. */
function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function validateInput(input: CouponInput, existingId: number | null): void {
  const code = normalizeCode(input.code);

  if (code === "") throw new UnprocessableError("A coupon needs a code to type in.");
  if (code.length > MAX_CODE_LENGTH) {
    throw new UnprocessableError(
      `Keep the code to ${String(MAX_CODE_LENGTH)} characters or fewer — customers type it by hand.`,
    );
  }
  if (!CODE_PATTERN.test(code)) {
    throw new UnprocessableError(
      "Codes are letters and digits only. Spaces and punctuation get mistyped at checkout.",
    );
  }

  const clash = allCoupons().find(
    (coupon) => coupon.code === code && coupon.id !== existingId,
  );
  if (clash !== undefined) {
    throw new UnprocessableError(`${code} is already in use. Every code has to be unique.`);
  }

  const value = Number.parseFloat(input.discount_value);
  if (!Number.isFinite(value) || value <= 0) {
    throw new UnprocessableError("The discount has to be worth something.");
  }
  if (input.discount_type === "percent" && value > FULL_PERCENT) {
    throw new UnprocessableError("A percentage discount cannot be more than 100%.");
  }
  if (input.discount_type === "percent" && input.max_discount_amount === null) {
    throw new UnprocessableError(
      "A percentage discount needs a cap. Without one, the biggest order on the platform decides what this costs.",
    );
  }
  if (
    input.discount_type === "flat" &&
    Number.parseFloat(input.min_order_value) < value
  ) {
    throw new UnprocessableError(
      "The minimum order has to be at least the discount, or the platform pays the customer to order.",
    );
  }

  if (Date.parse(input.valid_until) <= Date.parse(input.valid_from)) {
    throw new UnprocessableError("The code has to expire after it starts, not before.");
  }

  if (input.scope === "restaurant") {
    if (input.restaurant_id === null) {
      throw new UnprocessableError("A restaurant code needs a restaurant.");
    }
    if (findRestaurant(input.restaurant_id) === null) {
      throw new UnprocessableError("That restaurant is not on the platform.");
    }
  }
  if (input.scope === "cuisine" && input.cuisine_id === null) {
    throw new UnprocessableError("A cuisine code needs a cuisine.");
  }

  if (input.usage_limit_total !== null && input.usage_limit_total < 1) {
    throw new UnprocessableError("A cap of zero redemptions is the same as switching it off.");
  }
  if (input.usage_limit_per_user < 1) {
    throw new UnprocessableError("Allow each customer at least one redemption.");
  }
}

/** The patch, resolved against what is already stored, so partial edits validate. */
function toInput(coupon: CouponRead, patch: CouponPatch): CouponInput {
  return {
    code: patch.code ?? coupon.code,
    description: patch.description ?? coupon.description,
    discount_type: patch.discount_type ?? coupon.discount_type,
    discount_value: patch.discount_value ?? coupon.discount_value,
    max_discount_amount:
      patch.max_discount_amount === undefined
        ? coupon.max_discount_amount
        : patch.max_discount_amount,
    min_order_value: patch.min_order_value ?? coupon.min_order_value,
    scope: patch.scope ?? coupon.scope,
    restaurant_id:
      patch.restaurant_id === undefined ? coupon.restaurant_id : patch.restaurant_id,
    cuisine_id: patch.cuisine_id === undefined ? coupon.cuisine_id : patch.cuisine_id,
    valid_from: patch.valid_from ?? coupon.valid_from,
    valid_until: patch.valid_until ?? coupon.valid_until,
    usage_limit_total:
      patch.usage_limit_total === undefined
        ? coupon.usage_limit_total
        : patch.usage_limit_total,
    usage_limit_per_user: patch.usage_limit_per_user ?? coupon.usage_limit_per_user,
  };
}

/** Scope decides which of the two targets is kept; the other is cleared. */
function scopedTargets(input: CouponInput): Pick<CouponRead, "restaurant_id" | "cuisine_id"> {
  if (input.scope === "restaurant") {
    return { restaurant_id: input.restaurant_id, cuisine_id: null };
  }
  if (input.scope === "cuisine") {
    return { restaurant_id: null, cuisine_id: input.cuisine_id };
  }
  return { restaurant_id: null, cuisine_id: null };
}

export const fixtureOffers: OffersService = {
  listCoupons: () => settle(toWholePage(allCoupons())),

  createCoupon: async (input) => {
    validateInput(input, null);
    const created = addCoupon((id) => ({
      id,
      code: normalizeCode(input.code),
      description: input.description.trim(),
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      max_discount_amount: input.max_discount_amount,
      min_order_value: input.min_order_value,
      scope: input.scope,
      ...scopedTargets(input),
      valid_from: input.valid_from,
      valid_until: input.valid_until,
      usage_limit_total: input.usage_limit_total,
      usage_limit_per_user: input.usage_limit_per_user,
      times_used: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    }));
    return settleWrite(created);
  },

  updateCoupon: async (couponId, patch) => {
    const coupon = requireCoupon(couponId);
    const resolved = toInput(coupon, patch);
    validateInput(resolved, couponId);

    patchCoupon(couponId, {
      ...resolved,
      code: normalizeCode(resolved.code),
      description: resolved.description.trim(),
      ...scopedTargets(resolved),
      ...(patch.is_active === undefined ? {} : { is_active: patch.is_active }),
    });
    return settleWrite(requireCoupon(couponId));
  },

  setCouponActive: async (couponId, isActive) => {
    requireCoupon(couponId);
    patchCoupon(couponId, { is_active: isActive });
    return settleWrite(requireCoupon(couponId));
  },
};
