import type {
  Cuisine,
  MenuCategory,
  MenuItem,
  MenuItemImage,
  Page,
  RestaurantDetail,
  RestaurantPolicy,
  RestaurantSummary,
} from "../../types";
import type { CatalogService, RestaurantQuery } from "../types";
import { NotFoundError, settle } from "./latency";

import cuisinesSeed from "./data/cuisines.json";
import menusSeed from "./data/menus.json";
import policiesSeed from "./data/policies.json";
import restaurantDetailsSeed from "./data/restaurant-details.json";
import restaurantsSeed from "./data/restaurants.json";

/**
 * The catalog, read from bundled JSON.
 *
 * Filtering, sorting and paging are done here rather than handed to the caller
 * whole, because that is what the real endpoint does: a screen that received
 * all 25 rows and sliced them itself would behave differently the day the list
 * outgrows one page.
 */

const RESTAURANTS = restaurantsSeed as readonly RestaurantSummary[];
const DETAILS = restaurantDetailsSeed as Readonly<Record<string, RestaurantDetail>>;
const MENUS = menusSeed as Readonly<Record<string, readonly MenuCategory[]>>;
const POLICIES = policiesSeed as Readonly<Record<string, RestaurantPolicy>>;
const CUISINES = cuisinesSeed as readonly Cuisine[];

function toMinutes(clock: string): number {
  const [hour, minute] = clock.split(":");
  return Number.parseInt(hour ?? "0", 10) * 60 + Number.parseInt(minute ?? "0", 10);
}

/** Mirrors the server's window logic, including one that crosses midnight. */
function isOpenAt(restaurant: RestaurantSummary, now: Date): boolean {
  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();
  const open = toMinutes(restaurant.opens_at);
  const close = toMinutes(restaurant.closes_at);
  return close > open
    ? minutesNow >= open && minutesNow < close
    : minutesNow >= open || minutesNow < close;
}

function cuisineSlugsFor(restaurantId: number): readonly string[] {
  const detail = DETAILS[String(restaurantId)];
  return (detail?.cuisines ?? []).map((cuisine) => cuisine.slug);
}

const SORTERS: Readonly<
  Record<string, (a: RestaurantSummary, b: RestaurantSummary) => number>
> = {
  // "Best first" is what a discovery list means, so rating leads descending.
  rating: (a, b) =>
    Number.parseFloat(b.rating) - Number.parseFloat(a.rating) ||
    b.rating_count - a.rating_count,
  price_for_two: (a, b) =>
    Number.parseFloat(a.price_for_two) - Number.parseFloat(b.price_for_two),
  name: (a, b) => a.name.localeCompare(b.name),
  avg_prep_minutes: (a, b) =>
    a.avg_prep_minutes - b.avg_prep_minutes ||
    Number.parseFloat(b.rating) - Number.parseFloat(a.rating),
};

function allMenuItems(restaurantId: number): readonly MenuItem[] {
  return (MENUS[String(restaurantId)] ?? []).flatMap((category) => category.items);
}

export const fixtureCatalog: CatalogService = {
  listCuisines: () => settle(CUISINES),

  listRestaurants: (query: RestaurantQuery) => {
    const now = new Date();
    const needle = (query.q ?? "").trim().toLowerCase();

    const matched = RESTAURANTS.filter((restaurant) => {
      if (!restaurant.is_active) return false;
      if (query.city !== undefined && query.city !== "") {
        if (restaurant.city.toLowerCase() !== query.city.toLowerCase()) return false;
      }
      if (needle !== "" && !restaurant.name.toLowerCase().includes(needle)) {
        return false;
      }
      if (query.cuisine !== undefined && query.cuisine !== "") {
        if (!cuisineSlugsFor(restaurant.id).includes(query.cuisine)) return false;
      }
      if (query.openNow === true && !isOpenAt(restaurant, now)) return false;
      return true;
    });

    const sorter = SORTERS[query.sort ?? "rating"] ?? SORTERS.rating;
    const ordered = [...matched].sort(sorter);

    const page: Page<RestaurantSummary> = {
      items: ordered.slice(query.offset, query.offset + query.limit),
      total: ordered.length,
      limit: query.limit,
      offset: query.offset,
    };
    return settle(page);
  },

  getRestaurant: (restaurantId) => {
    const detail = DETAILS[String(restaurantId)];
    if (detail === undefined) {
      return Promise.reject(new NotFoundError(`No restaurant with id ${restaurantId}`));
    }
    return settle(detail);
  },

  getPolicy: (restaurantId) => {
    const policy = POLICIES[String(restaurantId)];
    if (policy === undefined) {
      return Promise.reject(
        new NotFoundError(`No policy for restaurant ${restaurantId}`),
      );
    }
    return settle(policy);
  },

  getMenu: (restaurantId) => settle(MENUS[String(restaurantId)] ?? []),

  getMenuItem: (menuItemId) => {
    for (const restaurantId of Object.keys(MENUS)) {
      const found = allMenuItems(Number.parseInt(restaurantId, 10)).find(
        (item) => item.id === menuItemId,
      );
      if (found !== undefined) return settle(found);
    }
    return Promise.reject(new NotFoundError(`No menu item with id ${menuItemId}`));
  },

  /**
   * The seed carries a cover per dish but no gallery rows, so the cover is
   * returned as a one-image gallery. Better than an empty carousel, and the
   * dish screen already handles a single image.
   */
  getMenuItemImages: async (menuItemId) => {
    const item = await fixtureCatalog.getMenuItem(menuItemId);
    // Optional in the schema, not merely nullable — both mean "no cover".
    const cover = item.image_url;
    if (cover === null || cover === undefined) return [];
    const image: MenuItemImage = {
      id: menuItemId,
      menu_item_id: menuItemId,
      storage_path: cover,
      url: cover,
      alt_text: item.name,
      sort_order: 0,
      width: null,
      height: null,
      created_at: new Date(0).toISOString(),
    };
    return [image];
  },

  countNonVegItems: (restaurantId) =>
    settle(allMenuItems(restaurantId).filter((item) => !item.is_veg).length),
};
