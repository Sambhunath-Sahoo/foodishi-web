/**
 * Coupons against the live API — one record, three scopes.
 *
 * The console's vocabulary and the wire's agree here, which is rare and worth
 * saying: `CouponInput` was written to mirror `CouponCreate` field for field, so
 * there is no renaming table in this file. What it does instead is the three
 * things the schema in app/schemas/coupon.py insists on and a form cannot:
 * aware timestamps, one target per scope, and a body that never carries an
 * explicit null for a NOT NULL column.
 *
 * WHAT THE REAL LISTING CANNOT SHOW. `GET /coupons` returns only codes a
 * customer could redeem right now — `is_active AND valid_from <= now <=
 * valid_until`, soonest to expire first — and it takes no parameter to widen
 * that. The offers board draws a card captioned "Expired, switched off or not
 * started" and offers a "Switch on" button, and against this endpoint that card
 * is permanently zero and that button is unreachable: switching a code off makes
 * its row disappear from the next refetch. The fixture returns every coupon,
 * which is why the screen was built that way. This is a missing capability on
 * the server — the honest fix is an `include_inactive` (or a `state`) query
 * parameter on that route, NOT a client-side workaround, because there is no
 * other route that enumerates coupons and guessing at the ones the server
 * withheld would be inventing rows.
 *
 * WHO MAY READ IT. The listing is guarded for platform staff or a restaurant
 * admin — never anonymous, so a signed-out console gets a 401 and a signed-in
 * customer a 403 rather than an empty page, which would read as "there are no
 * coupons". An operator's own token satisfies it platform-wide.
 */
import { api } from "@repo/api-client";
import type { components } from "@repo/api-client";
import type { CouponRead, CouponScope, Page } from "../../api-types";
import type { CouponInput, CouponPatch, OffersService } from "../types";

type WireCouponCreate = components["schemas"]["CouponCreate"];
type WireCouponUpdate = components["schemas"]["CouponUpdate"];

/**
 * The window `listCoupons()` reads.
 *
 * The interface takes no `PageQuery` — the board is one table of live codes,
 * and the platform has tens of them, not thousands. 100 is the API's own
 * MAX_LIMIT, and `Page.total` still travels back untouched, so a platform that
 * outgrows one page says so in the number the page already carries.
 */
const COUPON_LIMIT = 100;

/**
 * Scope decides which target travels; the other is sent as null.
 *
 * Not tidiness. `_check_scope_target` refuses a global coupon that names a
 * restaurant or a cuisine outright (422), and it does NOT refuse a
 * restaurant-scoped coupon that still carries the cuisine_id left over from
 * before the operator changed the scope — that one is stored, and
 * `services/coupons.evaluate` matches on the scope's own target, so the stray
 * value sits in the row forever meaning nothing. The dialog drops the field
 * that cannot apply from the form; this drops it from the body to match.
 */
function scopedTargets(
  scope: CouponScope,
  restaurantId: number | null,
  cuisineId: number | null,
): { readonly restaurant_id: number | null; readonly cuisine_id: number | null } {
  if (scope === "restaurant") return { restaurant_id: restaurantId, cuisine_id: null };
  if (scope === "cuisine") return { restaurant_id: null, cuisine_id: cuisineId };
  return { restaurant_id: null, cuisine_id: null };
}

/**
 * A timestamp the API will accept.
 *
 * `valid_from` and `valid_until` are `AwareDatetime` on the wire, because the
 * columns are timestamptz and the coupon service compares them against an aware
 * `now()` — a naive value is a 422, and were it to get through it would be a
 * TypeError in the comparison. `components/coupon-dialog.tsx` already produces
 * `toISOString()`, so this is normally a no-op; it exists because
 * `CouponInput.valid_from` is typed `string` and a `datetime-local` value
 * reaching it unconverted ("2026-01-01T10:00") is one edit away at any time.
 * Re-parsing reads such a value as the reader's own wall clock, which is what
 * they meant by it.
 *
 * An unparseable string is passed through rather than replaced: the server's
 * 422 names the field, and a fabricated instant would create a coupon that runs
 * over a window nobody chose.
 */
function toAware(value: string): string {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : value;
}

export const apiOffers: OffersService = {
  listCoupons() {
    // Returned as the server sent it. `Page<CouponRead>` is the wire's envelope
    // already — items, total, limit, offset — and `CouponRead` is the generated
    // schema, so there is nothing here to map and nothing to drift.
    return api.get<Page<CouponRead>>("/coupons", {
      query: { limit: COUPON_LIMIT, offset: 0 },
    });
  },

  createCoupon(input: CouponInput) {
    // Typed as the wire's own CouponCreate so a field the console adds and the
    // API does not accept is a compile error here rather than a 422 at the
    // dialog's save button — `CouponCreate` is extra="forbid".
    const body: WireCouponCreate = {
      code: input.code,
      description: input.description,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      max_discount_amount: input.max_discount_amount,
      min_order_value: input.min_order_value,
      scope: input.scope,
      ...scopedTargets(input.scope, input.restaurant_id, input.cuisine_id),
      valid_from: toAware(input.valid_from),
      valid_until: toAware(input.valid_until),
      usage_limit_total: input.usage_limit_total,
      usage_limit_per_user: input.usage_limit_per_user,
      // `is_active` and `times_used` are absent on purpose and cannot be sent:
      // a new code is live and unused, and both are the server's to own.
    };
    // The code is NOT normalised here. The router upper-cases it and the schema
    // strips its whitespace, so the row that comes back is the code customers
    // will actually type — normalising first would mean two places deciding
    // what a code looks like, and the client's copy is the one that drifts.
    return api.post<CouponRead>("/coupons", body);
  },

  updateCoupon(couponId, patch: CouponPatch) {
    // Spread, because `CouponPatch` is `Partial<CouponInput>` and every name on
    // it is a name on `CouponUpdate`. Keys carrying `undefined` disappear in
    // JSON.stringify, which is exactly the `exclude_unset` semantics the
    // handler relies on — and an explicit null never appears for a NOT NULL
    // column, which `reject_explicit_nulls` refuses by name.
    //
    // The wire's partial validators fire only on the keys a body carries: a
    // patch changing `discount_type` has to restate `max_discount_amount`, and
    // one changing `scope` has to restate its target. The dialog submits the
    // whole draft every time, so the companions always travel; the annotation
    // is what keeps that assumption typed.
    const body: WireCouponUpdate = {
      ...patch,
      ...(patch.scope === undefined
        ? {}
        : scopedTargets(
            patch.scope,
            patch.restaurant_id ?? null,
            patch.cuisine_id ?? null,
          )),
      ...(patch.valid_from === undefined
        ? {}
        : { valid_from: toAware(patch.valid_from) }),
      ...(patch.valid_until === undefined
        ? {}
        : { valid_until: toAware(patch.valid_until) }),
    };
    return api.patch<CouponRead>(`/coupons/${couponId}`, body);
  },

  setCouponActive(couponId, isActive) {
    // The same PATCH with one field, rather than a route of its own. Sending
    // only `is_active` satisfies `require_at_least_one_field` and trips none of
    // the consistency validators, so the switch can never disturb a window or a
    // cap on its way through.
    //
    // Switching a code OFF removes it from `listCoupons()` on the next refetch:
    // see the note at the top of this file. The mutation invalidates the coupon
    // tree, so the row leaves the board rather than lingering as a stale one
    // claiming to be off — which is the better of the two wrong answers until
    // the route can list inactive codes.
    return api.patch<CouponRead>(`/coupons/${couponId}`, { is_active: isActive });
  },
};
