"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { Cuisine, Page, RestaurantDetail, RestaurantSummary } from "../api-types";
import { services } from "../services";
import type { RestaurantPatch } from "../services/types";
import { keys } from "./keys";
import { METRICS_STALE_MS } from "./metrics";

/**
 * The catalogue, and the two things an operator can do to a kitchen.
 *
 * Both writes invalidate the metrics tree as well as the catalogue: the
 * overview's "active kitchens" tile and the commission ledger are both computed
 * from these rows, and a console where switching a kitchen off left the count
 * beside it unchanged would be worse than one with no count at all.
 */
export function useRestaurants(): UseQueryResult<Page<RestaurantSummary>> {
  return useQuery({
    queryKey: keys.restaurants.list(),
    queryFn: () => services.catalog.listRestaurants(),
    staleTime: METRICS_STALE_MS,
  });
}

/**
 * id -> the whole kitchen, for every restaurant on the platform.
 *
 * Order rows carry `restaurant_id` only, and "#12" on a live board tells an
 * operator nothing. The row is kept whole rather than projected down to a name
 * because `image_url` is on the same response, and a board that has already
 * paid for the request should not fetch the kitchen again to show its cover.
 */
export function useRestaurantDirectory(): UseQueryResult<
  ReadonlyMap<number, RestaurantSummary>
> {
  return useQuery({
    queryKey: keys.restaurants.directory(),
    queryFn: async () => {
      const page = await services.catalog.listRestaurants();
      return new Map(page.items.map((row) => [row.id, row]));
    },
    staleTime: METRICS_STALE_MS,
  });
}

export function useRestaurant(
  restaurantId: number | null,
): UseQueryResult<RestaurantDetail> {
  return useQuery({
    queryKey: keys.restaurants.one(restaurantId),
    enabled: restaurantId !== null,
    queryFn: () => services.catalog.getRestaurant(restaurantId ?? 0),
    staleTime: METRICS_STALE_MS,
  });
}

export function useCuisines(): UseQueryResult<readonly Cuisine[]> {
  return useQuery({
    queryKey: keys.cuisines.list(),
    queryFn: () => services.catalog.listCuisines(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export interface UpdateRestaurantInput {
  readonly restaurantId: number;
  readonly patch: RestaurantPatch;
}

export function useUpdateRestaurant(): UseMutationResult<
  RestaurantDetail,
  Error,
  UpdateRestaurantInput
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ restaurantId, patch }: UpdateRestaurantInput) =>
      services.catalog.updateRestaurant(restaurantId, patch),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.restaurants.all });
      void client.invalidateQueries({ queryKey: keys.metrics.all });
      void client.invalidateQueries({ queryKey: keys.reports.all });
    },
  });
}

export interface SetRestaurantActiveInput {
  readonly restaurantId: number;
  readonly isActive: boolean;
}

export function useSetRestaurantActive(): UseMutationResult<
  RestaurantDetail,
  Error,
  SetRestaurantActiveInput
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ restaurantId, isActive }: SetRestaurantActiveInput) =>
      services.catalog.setRestaurantActive(restaurantId, isActive),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.restaurants.all });
      void client.invalidateQueries({ queryKey: keys.metrics.all });
      void client.invalidateQueries({ queryKey: keys.reports.all });
    },
  });
}
