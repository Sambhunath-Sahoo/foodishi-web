"use client";

import { createLocalStore, isRecord, parseList } from "./local-store";
import type { MenuItem, RestaurantSummary } from "./types";

/**
 * Saved kitchens and saved dishes. Browser-only for now — there is no
 * /favorites endpoint — so a favourite is scoped to this device, not the
 * account. Enough of the row is copied in to render a card without refetching
 * a restaurant that may since have closed.
 */
const STORAGE_KEY = "foodishi.customer.favorites.v1";

export interface FavoriteRestaurant {
  readonly restaurantId: number;
  readonly name: string;
  readonly slug: string;
  readonly area: string;
  readonly city: string;
  readonly rating: string;
  readonly imageUrl: string | null;
  readonly savedAt: string;
}

export interface FavoriteItem {
  readonly menuItemId: number;
  readonly name: string;
  /** Kept verbatim as the API's decimal string; only formatted for display. */
  readonly unitPrice: string;
  readonly isVeg: boolean;
  readonly restaurantId: number;
  readonly restaurantName: string;
  readonly restaurantSlug: string;
  readonly savedAt: string;
}

export interface Favorites {
  readonly restaurants: readonly FavoriteRestaurant[];
  readonly items: readonly FavoriteItem[];
}

const EMPTY: Favorites = { restaurants: [], items: [] };

function isFavoriteRestaurant(value: unknown): value is FavoriteRestaurant {
  if (!isRecord(value)) return false;
  return (
    typeof value.restaurantId === "number" &&
    typeof value.name === "string" &&
    typeof value.slug === "string" &&
    typeof value.savedAt === "string"
  );
}

function isFavoriteItem(value: unknown): value is FavoriteItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.menuItemId === "number" &&
    typeof value.name === "string" &&
    typeof value.unitPrice === "string" &&
    typeof value.restaurantId === "number" &&
    typeof value.savedAt === "string"
  );
}

function parseFavorites(raw: unknown): Favorites {
  if (!isRecord(raw)) return EMPTY;
  return {
    restaurants: parseList(raw.restaurants, isFavoriteRestaurant),
    items: parseList(raw.items, isFavoriteItem),
  };
}

const store = createLocalStore<Favorites>(STORAGE_KEY, EMPTY, parseFavorites);

export interface FavoritesApi {
  readonly favorites: Favorites;
  readonly isReady: boolean;
  readonly isRestaurantSaved: (restaurantId: number) => boolean;
  readonly isItemSaved: (menuItemId: number) => boolean;
  readonly toggleRestaurant: (restaurant: RestaurantSummary) => void;
  readonly toggleItem: (
    item: MenuItem,
    restaurant: { readonly id: number; readonly name: string; readonly slug: string },
  ) => void;
  /**
   * Un-save by id. The favourites screen already holds the stored row and has
   * no RestaurantSummary or MenuItem to hand back to the toggles.
   */
  readonly removeRestaurant: (restaurantId: number) => void;
  readonly removeItem: (menuItemId: number) => void;
}

export function useFavorites(): FavoritesApi {
  const [favorites, isReady] = store.use();

  return {
    favorites,
    isReady,
    isRestaurantSaved: (restaurantId) =>
      favorites.restaurants.some((row) => row.restaurantId === restaurantId),
    isItemSaved: (menuItemId) =>
      favorites.items.some((row) => row.menuItemId === menuItemId),

    toggleRestaurant: (restaurant) => {
      store.update((current) => {
        const isSaved = current.restaurants.some(
          (row) => row.restaurantId === restaurant.id,
        );
        if (isSaved) {
          return {
            ...current,
            restaurants: current.restaurants.filter(
              (row) => row.restaurantId !== restaurant.id,
            ),
          };
        }
        // Newest first: the list is read top-down and never paginated.
        return {
          ...current,
          restaurants: [
            {
              restaurantId: restaurant.id,
              name: restaurant.name,
              slug: restaurant.slug,
              area: restaurant.area,
              city: restaurant.city,
              rating: String(restaurant.rating),
              imageUrl: restaurant.image_url ?? null,
              savedAt: new Date().toISOString(),
            },
            ...current.restaurants,
          ],
        };
      });
    },

    toggleItem: (item, restaurant) => {
      store.update((current) => {
        const isSaved = current.items.some((row) => row.menuItemId === item.id);
        if (isSaved) {
          return {
            ...current,
            items: current.items.filter((row) => row.menuItemId !== item.id),
          };
        }
        return {
          ...current,
          items: [
            {
              menuItemId: item.id,
              name: item.name,
              unitPrice: String(item.price),
              isVeg: item.is_veg,
              restaurantId: restaurant.id,
              restaurantName: restaurant.name,
              restaurantSlug: restaurant.slug,
              savedAt: new Date().toISOString(),
            },
            ...current.items,
          ],
        };
      });
    },

    removeRestaurant: (restaurantId) => {
      store.update((current) => ({
        ...current,
        restaurants: current.restaurants.filter(
          (row) => row.restaurantId !== restaurantId,
        ),
      }));
    },

    removeItem: (menuItemId) => {
      store.update((current) => ({
        ...current,
        items: current.items.filter((row) => row.menuItemId !== menuItemId),
      }));
    },
  };
}
