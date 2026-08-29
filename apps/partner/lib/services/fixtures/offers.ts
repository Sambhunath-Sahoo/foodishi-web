/**
 * Offers and coupons.
 *
 * An offer applies itself — a customer sees "20% off" on the restaurant and
 * gets it. A coupon has to be typed, which is why it carries usage limits and
 * an offer does not: a code that leaks needs a ceiling, a banner does not.
 *
 * `redemption_count` is never writable here. It is the server's count of orders
 * that used the thing, and a console that could edit it would be able to lie
 * about its own performance to itself.
 */
import type {
  Coupon,
  CouponCreate,
  CouponPatch,
  Offer,
  OfferCreate,
  OfferKind,
  OfferPatch,
} from "../../types";
import type { OffersService } from "../types";
import { omit } from "../../omit";
import { ConflictError, UnprocessableError, settle } from "./latency";
import { requireFound, requirePermission } from "./guard";
import {
  allCoupons,
  allOffers,
  deleteCoupon,
  deleteOffer,
  findCoupon,
  findOffer,
  takeId,
  writeCoupon,
  writeOffer,
} from "./store";

const TITLE_MIN = 4;
const CODE_PATTERN = /^[A-Z0-9]{4,20}$/;
const MAX_PERCENT = 90;

/**
 * The rules a discount has to obey whatever kind it is.
 *
 * The percentage ceiling is the one worth stating: a kitchen typing 100 into a
 * percent field has made a mistake nobody catches until the orders arrive, and
 * "90" is a limit that never blocks a real promotion.
 */
function requireDiscount(kind: OfferKind, value: string, maxDiscount: string | null): void {
  if (kind === "free_delivery") return;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new UnprocessableError("A discount has to be worth something.");
  }
  if (kind === "percent" && amount > MAX_PERCENT) {
    throw new UnprocessableError(
      `${MAX_PERCENT}% is the most a single offer can take off. Anything higher is almost always a typo.`,
    );
  }
  if (kind === "percent" && maxDiscount === null) {
    throw new UnprocessableError(
      "A percentage needs a cap, or one large order takes the whole evening's margin with it.",
    );
  }
}

function requireWindow(startsAt: string, endsAt: string | null): void {
  if (endsAt === null) return;
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new UnprocessableError("The end has to come after the start.");
  }
}

export const fixtureOffers: OffersService = {
  listOffers(restaurantId) {
    requirePermission(restaurantId, "offers.view");
    return settle(
      allOffers()
        .filter((offer) => offer.restaurant_id === restaurantId)
        // Live first, then by newest start: the ones a customer can see now are
        // the ones somebody opened this screen to check.
        .sort((left, right) => {
          if (left.is_active !== right.is_active) return left.is_active ? -1 : 1;
          return new Date(right.starts_at).getTime() - new Date(left.starts_at).getTime();
        }),
    );
  },

  createOffer(restaurantId, body: OfferCreate) {
    requirePermission(restaurantId, "offers.manage");
    const title = body.title.trim();
    if (title.length < TITLE_MIN) {
      throw new UnprocessableError(
        "Give the offer a title a customer would understand at a glance.",
      );
    }
    requireDiscount(body.kind, body.value, body.max_discount);
    requireWindow(body.starts_at, body.ends_at);
    const offer: Offer = {
      ...body,
      title,
      id: takeId("offer"),
      restaurant_id: restaurantId,
      redemption_count: 0,
    };
    writeOffer(offer);
    return settle(offer);
  },

  updateOffer(offerId, patch: OfferPatch) {
    const existing = requireFound(findOffer(offerId), "That offer");
    requirePermission(existing.restaurant_id, "offers.manage");
    const updated: Offer = { ...existing, ...patch };
    requireDiscount(updated.kind, updated.value, updated.max_discount);
    requireWindow(updated.starts_at, updated.ends_at);
    writeOffer(updated);
    return settle(updated);
  },

  async deleteOffer(offerId) {
    const existing = requireFound(findOffer(offerId), "That offer");
    requirePermission(existing.restaurant_id, "offers.manage");
    if (existing.redemption_count > 0) {
      throw new ConflictError(
        `${existing.title} has been used on ${existing.redemption_count} orders and cannot be deleted — those orders keep their link to it. Switch it off instead: it stops applying straight away and the numbers stay.`,
      );
    }
    deleteOffer(offerId);
    await settle(null);
  },

  listCoupons(restaurantId) {
    requirePermission(restaurantId, "offers.view");
    return settle(
      allCoupons()
        .filter((coupon) => coupon.restaurant_id === restaurantId)
        .sort((left, right) => {
          if (left.is_active !== right.is_active) return left.is_active ? -1 : 1;
          return left.code.localeCompare(right.code);
        }),
    );
  },

  createCoupon(restaurantId, body: CouponCreate) {
    requirePermission(restaurantId, "offers.manage");
    const code = body.code.trim().toUpperCase();
    if (!CODE_PATTERN.test(code)) {
      throw new UnprocessableError(
        "A code is 4 to 20 characters, capitals and digits only — it has to survive being read out over a phone.",
      );
    }
    if (allCoupons().some((coupon) => coupon.code === code)) {
      throw new ConflictError(
        `${code} is already in use. Codes are unique across the platform, so pick another.`,
      );
    }
    requireDiscount(body.kind, body.value, body.max_discount);
    requireWindow(body.starts_at, body.ends_at);
    if (body.per_user_limit < 1) {
      throw new UnprocessableError("One customer has to be able to use it at least once.");
    }
    if (body.usage_limit !== null && body.usage_limit < body.per_user_limit) {
      throw new UnprocessableError(
        "The total limit cannot be smaller than what one customer may use.",
      );
    }
    const coupon: Coupon = {
      ...body,
      code,
      id: takeId("coupon"),
      restaurant_id: restaurantId,
      redemption_count: 0,
    };
    writeCoupon(coupon);
    return settle(coupon);
  },

  updateCoupon(couponId, patch: CouponPatch) {
    const existing = requireFound(findCoupon(couponId), "That coupon");
    requirePermission(existing.restaurant_id, "offers.manage");
    // The code is not editable once it exists: customers have it written down,
    // and renaming it silently breaks every one of them.
    const updated: Coupon = { ...existing, ...omit(patch, "code") };
    requireDiscount(updated.kind, updated.value, updated.max_discount);
    requireWindow(updated.starts_at, updated.ends_at);
    if (
      updated.usage_limit !== null &&
      updated.usage_limit < updated.redemption_count
    ) {
      throw new UnprocessableError(
        `${updated.code} has already been used ${updated.redemption_count} times, so the limit cannot go below that. Switch it off to stop it.`,
      );
    }
    writeCoupon(updated);
    return settle(updated);
  },

  async deleteCoupon(couponId) {
    const existing = requireFound(findCoupon(couponId), "That coupon");
    requirePermission(existing.restaurant_id, "offers.manage");
    if (existing.redemption_count > 0) {
      throw new ConflictError(
        `${existing.code} has been used ${existing.redemption_count} times and cannot be deleted — those orders keep their link to it. Switch it off instead and it stops working immediately.`,
      );
    }
    deleteCoupon(couponId);
    await settle(null);
  },
};
