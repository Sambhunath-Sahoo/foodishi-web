/**
 * Offers and coupons, against the live API — where only ONE of the two exists.
 *
 * There is no `/offers` route and there is not going to be. `CouponScope`
 * already has a `restaurant` member, and a self-applying offer is a coupon with
 * no code, so the platform models both as one table. That is the right call:
 * two tables holding "a discount belonging to this restaurant" would need every
 * pricing rule written twice.
 *
 * So the offer half of this service refuses, and the refusal says what to do
 * rather than naming a route that will never ship. The console's `Offer` entity
 * is fixture-only and should be folded into coupons — that is a UI change, not
 * a backend one, and it is deliberately not smuggled in here.
 *
 * The coupon half is real, and restaurant admins genuinely may write their own:
 * `_assert_may_write` in app/routers/coupons.py admits a restaurant admin for a
 * restaurant-scoped coupon, and refuses them a global or cuisine one because
 * that would come out of the platform's own take rather than theirs.
 *
 * The field mapping below is the whole reason this file is not three lines. The
 * console's vocabulary was written before the wire's and they disagree on seven
 * names; mapping in one place beats renaming every screen.
 */
import { ApiError, api } from "@repo/api-client";
import type { components } from "@repo/api-client";
import type { Coupon, CouponCreate, CouponPatch, OfferKind } from "../../types";
import type { OffersService } from "../types";

type WireCoupon = components["schemas"]["CouponRead"];
type WireDiscountType = components["schemas"]["DiscountType"];

/** Sent on every write: a restaurant may only ever mint its own. */
const RESTAURANT_SCOPE = "restaurant";

/**
 * Free delivery has no `DiscountType` on the wire — the platform models it as a
 * flat discount and the delivery fee is decided by the restaurant's policy, not
 * by a coupon. So the console's third kind cannot round-trip, and pretending
 * otherwise would create coupons that silently discount the subtotal instead.
 */
function toWireDiscount(kind: OfferKind): WireDiscountType {
  if (kind === "free_delivery") {
    throw new ApiError({
      status: 422,
      url: "/coupons",
      detail:
        "Free delivery is not a coupon the platform can express — a coupon takes a percentage or an amount off the order, and the delivery fee comes from this restaurant's policy. Use a percentage or a flat amount, or ask Foodishi to waive delivery for this restaurant.",
      action: "show-detail",
    });
  }
  return kind === "percent" ? "percent" : "flat";
}

function fromWire(row: WireCoupon): Coupon {
  return {
    id: row.id,
    // A global or cuisine coupon has no restaurant. It cannot appear in a
    // restaurant-filtered list, so 0 is unreachable rather than a real value.
    restaurant_id: row.restaurant_id ?? 0,
    code: row.code,
    kind: row.discount_type === "percent" ? "percent" : "flat",
    value: row.discount_value,
    max_discount: row.max_discount_amount,
    min_order_value: row.min_order_value,
    usage_limit: row.usage_limit_total,
    per_user_limit: row.usage_limit_per_user,
    starts_at: row.valid_from,
    ends_at: row.valid_until,
    is_active: row.is_active,
    redemption_count: row.times_used,
  };
}

/**
 * `description` is required on the wire and absent from the console's form.
 * Derived rather than left blank: it is what an operator sees in the platform's
 * own coupon list, and "" there is worse than a sentence nobody typed.
 */
function describe(body: CouponCreate | CouponPatch, code: string): string {
  if (body.kind === "percent" && body.value !== undefined) {
    return `${body.value}% off at this restaurant (${code})`;
  }
  if (body.kind === "flat" && body.value !== undefined) {
    return `₹${body.value} off at this restaurant (${code})`;
  }
  return `Restaurant coupon ${code}`;
}

const OFFERS_ARE_COUPONS =
  "Self-applying offers are not a separate thing on the platform — a coupon scoped to this restaurant is the same mechanism. Create a coupon instead; the offers tab is sample data only.";

function offersUnavailable(): never {
  throw new ApiError({
    status: 501,
    url: "/offers",
    detail: OFFERS_ARE_COUPONS,
    action: "show-detail",
  });
}

export const apiOffers: OffersService = {
  listOffers: () => offersUnavailable(),
  createOffer: () => offersUnavailable(),
  updateOffer: () => offersUnavailable(),
  deleteOffer: () => offersUnavailable(),

  async listCoupons(restaurantId, signal) {
    // GET /coupons is scoped by the caller: a restaurant admin sees their own
    // restaurant's coupons, a platform admin sees everything. restaurant_id is
    // sent anyway so a person who is admin of two kitchens gets one kitchen's.
    const page = await api.get<{ readonly items: readonly WireCoupon[] }>(
      "/coupons",
      { signal, query: { restaurant_id: restaurantId, limit: 100, offset: 0 } },
    );
    return page.items.map(fromWire);
  },

  async createCoupon(restaurantId, body: CouponCreate) {
    const code = body.code.trim().toUpperCase();
    const written = await api.post<WireCoupon>("/coupons", {
      code,
      description: describe(body, code),
      discount_type: toWireDiscount(body.kind),
      discount_value: body.value,
      max_discount_amount: body.max_discount,
      min_order_value: body.min_order_value,
      // Pinned, not taken from the caller: a restaurant admin minting a global
      // coupon would spend the platform's margin, and the server refuses it —
      // sending the honest scope means the refusal never has to happen.
      scope: RESTAURANT_SCOPE,
      restaurant_id: restaurantId,
      valid_from: body.starts_at,
      // Required on the wire; the console lets a coupon run open-ended. A
      // century out is the honest encoding of "until somebody switches it off".
      valid_until: body.ends_at ?? "2126-01-01T00:00:00Z",
      usage_limit_total: body.usage_limit,
      usage_limit_per_user: body.per_user_limit,
    });
    return fromWire(written);
  },

  async updateCoupon(couponId, patch: CouponPatch) {
    // The code is deliberately not sent even though the wire accepts it:
    // customers have it written down, and renaming it silently breaks every one
    // of them. The console's dialog locks the field for the same reason.
    const written = await api.patch<WireCoupon>(`/coupons/${couponId}`, {
      ...(patch.kind === undefined
        ? {}
        : { discount_type: toWireDiscount(patch.kind) }),
      ...(patch.value === undefined ? {} : { discount_value: patch.value }),
      ...(patch.max_discount === undefined
        ? {}
        : { max_discount_amount: patch.max_discount }),
      ...(patch.min_order_value === undefined
        ? {}
        : { min_order_value: patch.min_order_value }),
      ...(patch.starts_at === undefined ? {} : { valid_from: patch.starts_at }),
      ...(patch.ends_at === undefined ? {} : { valid_until: patch.ends_at }),
      ...(patch.usage_limit === undefined
        ? {}
        : { usage_limit_total: patch.usage_limit }),
      ...(patch.per_user_limit === undefined
        ? {}
        : { usage_limit_per_user: patch.per_user_limit }),
      ...(patch.is_active === undefined ? {} : { is_active: patch.is_active }),
    });
    return fromWire(written);
  },

  deleteCoupon() {
    // There is no DELETE /coupons/{id}, and that is correct rather than missing:
    // a coupon that has been used is referenced by orders, so deleting one would
    // orphan a discount on somebody's receipt. Switching it off stops it working
    // immediately and keeps the numbers, which is what the dialog already offers.
    throw new ApiError({
      status: 501,
      url: "/coupons/{id}",
      detail:
        "A coupon cannot be deleted — past orders keep their link to it. Switch it off instead: it stops working immediately and its numbers stay.",
      action: "show-detail",
    });
  },
};
