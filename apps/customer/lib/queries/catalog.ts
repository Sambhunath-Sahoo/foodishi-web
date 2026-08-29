"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { services } from "../services";
import type {
  Cuisine,
  MenuCategory,
  MenuItem,
  MenuItemImage,
  Page,
  RestaurantDetail,
  RestaurantPolicy,
  RestaurantSort,
  RestaurantSummary,
} from "../types";

export const DISCOVERY_PAGE_SIZE = 12;

export interface RestaurantFilters {
  readonly city?: string;
  readonly cuisine?: string;
  readonly q?: string;
  readonly openNow?: boolean;
  readonly sort?: RestaurantSort;
  readonly offset?: number;
}

export function useCuisines(): UseQueryResult<readonly Cuisine[]> {
  return useQuery({
    queryKey: ["cuisines"],
    // A fixed handful of rows that changes about never.
    staleTime: 30 * 60 * 1000,
    queryFn: () => services.catalog.listCuisines(),
  });
}

export function useRestaurants(
  filters: RestaurantFilters,
): UseQueryResult<Page<RestaurantSummary>> {
  const { city, cuisine, q, openNow, sort = "rating", offset = 0 } = filters;
  return useQuery({
    queryKey: ["restaurants", { city, cuisine, q, openNow, sort, offset }],
    queryFn: () =>
      services.catalog.listRestaurants({
        city,
        cuisine,
        q,
        openNow,
        sort,
        limit: DISCOVERY_PAGE_SIZE,
        offset,
      }),
  });
}

/**
 * `/restaurants` has no veg-only filter — the flag lives on menu items, not on
 * the restaurant row. `/restaurants/{id}/menu/search?is_veg=false&limit=1`
 * answers "does this kitchen serve anything non-veg?" in one count, so a
 * kitchen with `total === 0` is genuinely pure veg. Runs only while the toggle
 * is on, and only for the restaurants already on screen.
 */
export function useVegOnlyIds(
  restaurantIds: readonly number[],
  enabled: boolean,
): UseQueryResult<readonly number[]> {
  const key = [...restaurantIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: ["veg-only", key],
    enabled: enabled && key.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const checks = await Promise.all(
        key.map(async (id) => ({
          id,
          isPureVeg: (await services.catalog.countNonVegItems(id)) === 0,
        })),
      );
      return checks.filter((check) => check.isPureVeg).map((check) => check.id);
    },
  });
}

export function useRestaurant(
  restaurantId: number | null,
): UseQueryResult<RestaurantDetail> {
  return useQuery({
    queryKey: ["restaurant", restaurantId],
    enabled: restaurantId !== null,
    queryFn: () => services.catalog.getRestaurant(restaurantId as number),
  });
}

export function useRestaurantPolicy(
  restaurantId: number | null,
): UseQueryResult<RestaurantPolicy> {
  return useQuery({
    queryKey: ["restaurant-policy", restaurantId],
    enabled: restaurantId !== null,
    queryFn: () => services.catalog.getPolicy(restaurantId as number),
  });
}

export function useMenu(
  restaurantId: number | null,
): UseQueryResult<readonly MenuCategory[]> {
  return useQuery({
    queryKey: ["menu", restaurantId],
    enabled: restaurantId !== null,
    queryFn: () => services.catalog.getMenu(restaurantId as number),
  });
}

/**
 * One dish, read by id rather than picked out of the menu already in the cache.
 *
 * A dish link has to work opened cold — from a share, a reload, or a bookmark —
 * and at that point there is no menu in hand to look it up in. MenuItemRead is
 * the same shape the menu row was built from, so a warm cache costs nothing
 * extra and a cold one still resolves.
 */
export function useMenuItem(itemId: number | null): UseQueryResult<MenuItem> {
  return useQuery({
    queryKey: ["menu-item", itemId],
    enabled: itemId !== null,
    queryFn: () => services.catalog.getMenuItem(itemId as number),
  });
}

/**
 * A dish's whole gallery, cover first.
 *
 * This is the one thing a dish screen knows that its menu row does not:
 * `MenuItemRead.image_url` is only position 0, and the rest of the photos are
 * behind their own public endpoint. An empty list is an ordinary answer — most
 * dishes have no photos at all.
 */
export function useMenuItemImages(
  itemId: number | null,
): UseQueryResult<readonly MenuItemImage[]> {
  return useQuery({
    queryKey: ["menu-item-images", itemId],
    enabled: itemId !== null,
    // Photos change when a manager uploads one, which is not on this screen's
    // timescale.
    staleTime: 10 * 60 * 1000,
    queryFn: () => services.catalog.getMenuItemImages(itemId as number),
  });
}

/**
 * `/restaurants/{id}` needs a numeric id but the URL carries a slug, so the
 * route accepts `8-chaat-chowk` and reads the leading id. A hand-typed
 * `chaat-chowk` still resolves: the list endpoint is searched by name and
 * matched on slug.
 */
export function parseRestaurantRef(param: string): { id: number | null; slug: string } {
  const match = /^(\d+)(?:-(.*))?$/.exec(param);
  if (match !== null) {
    return { id: Number.parseInt(match[1] ?? "", 10), slug: match[2] ?? "" };
  }
  return { id: null, slug: param };
}

export function restaurantHref(restaurant: {
  readonly id: number;
  readonly slug: string;
}): string {
  return `/r/${restaurant.id}-${restaurant.slug}`;
}

/**
 * A dish sits under its kitchen — `/r/{id}-{slug}/i/{itemId}` — so the bottom
 * tab bar keeps "Discover" lit while a dish is open, and the URL still says
 * whose kitchen it is when the link is shared.
 */
export function menuItemHref(
  restaurant: { readonly id: number; readonly slug: string },
  itemId: number,
): string {
  return `${restaurantHref(restaurant)}/i/${itemId}`;
}

/** Slug -> id, only when the URL did not carry one. */
export function useRestaurantIdBySlug(
  slug: string,
  enabled: boolean,
): UseQueryResult<number | null> {
  return useQuery({
    queryKey: ["restaurant-by-slug", slug],
    enabled: enabled && slug !== "",
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const page = await services.catalog.listRestaurants({
        q: slug.replaceAll("-", " "),
        limit: 50,
        offset: 0,
      });
      return page.items.find((row) => row.slug === slug)?.id ?? null;
    },
  });
}

/**
 * One page of kitchens, cached, used only to turn an id into a name and to
 * offer the real list of cities the seed data actually covers. The order
 * history carries `restaurant_id` and nothing else, and a customer should not
 * be reading "Order from #7".
 */
const INDEX_LIMIT = 100;

export function useRestaurantIndex(): UseQueryResult<Page<RestaurantSummary>> {
  return useQuery({
    queryKey: ["restaurant-index"],
    staleTime: 10 * 60 * 1000,
    queryFn: () =>
      services.catalog.listRestaurants({ limit: INDEX_LIMIT, offset: 0 }),
  });
}

export function toRestaurantNameMap(
  page: Page<RestaurantSummary> | undefined,
): ReadonlyMap<number, RestaurantSummary> {
  return new Map((page?.items ?? []).map((row) => [row.id, row]));
}

/** The cities that have kitchens in them, rather than a hardcoded list. */
export function toCityOptions(
  page: Page<RestaurantSummary> | undefined,
): readonly { readonly value: string; readonly label: string }[] {
  const cities = [...new Set((page?.items ?? []).map((row) => row.city))].sort(
    (a, b) => a.localeCompare(b),
  );
  return cities.map((city) => ({ value: city, label: city }));
}
