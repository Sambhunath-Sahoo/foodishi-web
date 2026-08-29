import type { Page, RestaurantDetail, RestaurantSummary } from "../../api-types";
import type { CatalogService, RestaurantPatch } from "../types";
import { NotFoundError, settle, settleWrite, UnprocessableError } from "./latency";
import { toWholePage } from "./paging";
import { SEED_CUISINES } from "./seed";
import { allRestaurants, findRestaurant, patchRestaurant } from "./store";

/**
 * The 25 kitchens, and the two things an operator can do to one: correct its
 * details, or switch it off.
 *
 * The list answers `RestaurantSummary` and the single read answers
 * `RestaurantDetail`, which is the split the API makes — a discovery list has
 * no business carrying a phone number and a street address. The seed stores the
 * detail and the summary is projected from it, so the two can never disagree
 * about a kitchen's name the way two files would.
 */

/** Nobody's prep time is under five minutes or over two hours. */
const MIN_PREP_MINUTES = 5;
const MAX_PREP_MINUTES = 120;

/** "23:30:00" or "23:30". Anything else is rejected before it is stored. */
const CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function toSummary(restaurant: RestaurantDetail): RestaurantSummary {
  return {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    city: restaurant.city,
    area: restaurant.area,
    rating: restaurant.rating,
    rating_count: restaurant.rating_count,
    price_for_two: restaurant.price_for_two,
    avg_prep_minutes: restaurant.avg_prep_minutes,
    opens_at: restaurant.opens_at,
    closes_at: restaurant.closes_at,
    is_active: restaurant.is_active,
    image_url: restaurant.image_url,
  };
}

function requireRestaurant(restaurantId: number): RestaurantDetail {
  const restaurant = findRestaurant(restaurantId);
  if (restaurant === null) {
    throw new NotFoundError(`No restaurant with id ${String(restaurantId)}.`);
  }
  return restaurant;
}

/**
 * Validation is here rather than in the form, because it is the rule and not
 * the widget: a second caller — a bulk edit, a real PATCH — must be refused for
 * the same reasons. The messages are written for the operator reading them, in
 * the same voice the API writes its own `detail` in.
 */
function validate(patch: RestaurantPatch): void {
  if (patch.name !== undefined && patch.name.trim() === "") {
    throw new UnprocessableError("A restaurant needs a name.");
  }
  if (patch.phone !== undefined && patch.phone.trim().length < 7) {
    throw new UnprocessableError(
      "A phone number needs at least 7 digits — support calls this number.",
    );
  }
  if (patch.avg_prep_minutes !== undefined) {
    const minutes = patch.avg_prep_minutes;
    if (
      !Number.isInteger(minutes) ||
      minutes < MIN_PREP_MINUTES ||
      minutes > MAX_PREP_MINUTES
    ) {
      throw new UnprocessableError(
        `Prep time has to be a whole number of minutes between ${String(MIN_PREP_MINUTES)} and ${String(MAX_PREP_MINUTES)}. Every delivery promise is built on it.`,
      );
    }
  }
  if (patch.price_for_two !== undefined && Number.parseFloat(patch.price_for_two) <= 0) {
    throw new UnprocessableError("Price for two has to be more than nothing.");
  }
  for (const [label, clock] of [
    ["Opening time", patch.opens_at],
    ["Closing time", patch.closes_at],
  ] as const) {
    if (clock !== undefined && !CLOCK_PATTERN.test(clock)) {
      throw new UnprocessableError(`${label} has to be a 24-hour clock time, like 09:30.`);
    }
  }
}

/** "9:30" -> "09:30:00", so what is stored matches what the API would send. */
function toClock(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

export const fixtureCatalog: CatalogService = {
  listRestaurants: (): Promise<Page<RestaurantSummary>> =>
    settle(toWholePage(allRestaurants().map(toSummary))),

  getRestaurant: async (restaurantId) => settle(requireRestaurant(restaurantId)),

  updateRestaurant: async (restaurantId, patch) => {
    requireRestaurant(restaurantId);
    validate(patch);
    patchRestaurant(restaurantId, {
      ...patch,
      ...(patch.opens_at === undefined ? {} : { opens_at: toClock(patch.opens_at) }),
      ...(patch.closes_at === undefined ? {} : { closes_at: toClock(patch.closes_at) }),
    });
    return settleWrite(requireRestaurant(restaurantId));
  },

  setRestaurantActive: async (restaurantId, isActive) => {
    requireRestaurant(restaurantId);
    patchRestaurant(restaurantId, { is_active: isActive });
    return settleWrite(requireRestaurant(restaurantId));
  },

  listCuisines: () => settle(SEED_CUISINES),
};
