/**
 * The restaurant itself: its profile, its trading hours, its prep time, and the
 * switch that decides whether it is taking orders at all.
 *
 * The switch is deliberately not a field on the patch. `is_active` is the one
 * column the order-placement path consults — a cart naming a closed restaurant
 * is refused outright — so closing has to be a call somebody made, never a side
 * effect of saving a phone number. Trading hours decide nothing except what a
 * customer reads, which is why they are labelled Hours and never Open.
 */
import type { RestaurantDetail, RestaurantPatch } from "../../types";
import type { RestaurantService } from "../types";
import { omit } from "../../omit";
import { UnprocessableError, settle } from "./latency";
import { requireFound, requirePermission } from "./guard";
import { findRestaurant, writeRestaurant } from "./store";

/** The API's own bounds, so a bad value is caught before it is a round trip. */
const PREP_MIN = 1;
const PREP_MAX = 240;
const NAME_MIN = 2;

/** "23:30" and "23:30:00" both arrive from a time input; both are stored long. */
function toTime(value: string, what: string): string {
  const match = /^(\d{2}):(\d{2})(:(\d{2}))?$/.exec(value.trim());
  if (match === null) {
    throw new UnprocessableError(`${what} has to be a time, like 23:30.`);
  }
  return `${match[1]}:${match[2]}:${match[4] ?? "00"}`;
}

function toAmount(value: string | number, what: string): string {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new UnprocessableError(`${what} has to be a number, and not a negative one.`);
  }
  return parsed.toFixed(2);
}

/**
 * Only the fields the patch actually carried.
 *
 * `null` is a real value for the nullable columns and an omission everywhere
 * else, which is the same rule the API applies — sending null for a required
 * column is how a restaurant ends up with no city.
 */
function apply(
  existing: RestaurantDetail,
  patch: RestaurantPatch,
): RestaurantDetail {
  const next: RestaurantDetail = {
    ...existing,
    ...(patch.name != null
      ? {
          name: (() => {
            const clean = patch.name.trim();
            if (clean.length < NAME_MIN) {
              throw new UnprocessableError(
                `A restaurant name needs at least ${NAME_MIN} characters.`,
              );
            }
            return clean;
          })(),
        }
      : {}),
    ...(patch.city != null ? { city: patch.city.trim() } : {}),
    ...(patch.area != null ? { area: patch.area.trim() } : {}),
    ...(patch.address_line != null ? { address_line: patch.address_line.trim() } : {}),
    ...(patch.phone != null ? { phone: patch.phone.trim() } : {}),
    ...(patch.latitude != null ? { latitude: String(patch.latitude) } : {}),
    ...(patch.longitude != null ? { longitude: String(patch.longitude) } : {}),
    ...(patch.price_for_two != null
      ? { price_for_two: toAmount(patch.price_for_two, "Price for two") }
      : {}),
    ...(patch.opens_at != null ? { opens_at: toTime(patch.opens_at, "Opening time") } : {}),
    ...(patch.closes_at != null
      ? { closes_at: toTime(patch.closes_at, "Closing time") }
      : {}),
    ...("description" in patch ? { description: patch.description ?? null } : {}),
    ...("image_url" in patch ? { image_url: patch.image_url ?? null } : {}),
  };

  if (patch.avg_prep_minutes != null) {
    const minutes = patch.avg_prep_minutes;
    if (!Number.isInteger(minutes) || minutes < PREP_MIN || minutes > PREP_MAX) {
      throw new UnprocessableError(
        `Prep time has to be a whole number of minutes between ${PREP_MIN} and ${PREP_MAX}. Every promised time on the queue is built from it.`,
      );
    }
    return { ...next, avg_prep_minutes: minutes };
  }
  return next;
}

export const fixtureRestaurant: RestaurantService = {
  get(restaurantId) {
    requirePermission(restaurantId, "restaurant.view");
    return settle(requireFound(findRestaurant(restaurantId), "That restaurant"));
  },

  getPolicy(restaurantId) {
    requirePermission(restaurantId, "restaurant.view");
    const restaurant = requireFound(findRestaurant(restaurantId), "That restaurant");
    return settle(
      requireFound(restaurant.policy ?? null, `A policy for ${restaurant.name}`),
    );
  },

  update(restaurantId, patch) {
    requirePermission(restaurantId, "restaurant.edit");
    const existing = requireFound(findRestaurant(restaurantId), "That restaurant");
    // is_active is ignored here even if it arrives: closing has its own call.
    const updated = apply(existing, omit(patch, "is_active"));
    writeRestaurant(restaurantId, updated);
    return settle(updated);
  },

  setAcceptingOrders(restaurantId, isActive) {
    requirePermission(restaurantId, "restaurant.edit");
    const existing = requireFound(findRestaurant(restaurantId), "That restaurant");
    const updated = { ...existing, is_active: isActive };
    writeRestaurant(restaurantId, updated);
    return settle(updated);
  },
};
