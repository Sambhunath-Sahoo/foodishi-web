"use client";

/**
 * The restaurant's own record.
 *
 * Both writes invalidate two keys, not one: this screen's profile AND the
 * membership list behind the header and the picker. They are different reads of
 * the same restaurant, and dropping only the profile leaves the chrome saying
 * "Open" over a kitchen that just closed.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { services } from "../services";
import { queryKeys } from "../query-keys";
import type { ReadyKitchen } from "../kitchen";
import type { RestaurantDetail, RestaurantPatch, RestaurantPolicy } from "../types";

function useInvalidateRestaurant(kitchen: ReadyKitchen): () => Promise<void> {
  const queryClient = useQueryClient();
  const { userId, restaurantId } = kitchen;
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.restaurant(userId, restaurantId),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.auth() }),
    ]);
  };
}

export function useRestaurant(
  kitchen: ReadyKitchen,
): UseQueryResult<RestaurantDetail> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.restaurant(userId, restaurantId),
    queryFn: ({ signal }) => services.restaurant.get(restaurantKey, signal),
  });
}

export function useRestaurantPolicy(
  kitchen: ReadyKitchen,
): UseQueryResult<RestaurantPolicy> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.policy(userId, restaurantId),
    retry: false,
    queryFn: ({ signal }) => services.restaurant.getPolicy(restaurantKey, signal),
  });
}

/** The profile and the trading hours. Never the open/close switch. */
export function useUpdateRestaurant(
  kitchen: ReadyKitchen,
): UseMutationResult<RestaurantDetail, Error, RestaurantPatch> {
  const invalidate = useInvalidateRestaurant(kitchen);
  return useMutation({
    mutationFn: (patch: RestaurantPatch) =>
      services.restaurant.update(kitchen.restaurantKey, patch),
    onSuccess: invalidate,
  });
}

/**
 * Stop or start taking orders. Its own mutation because it is its own call: a
 * customer feels this one immediately, and closing must never be a side effect
 * of saving a phone number.
 */
export function useSetAcceptingOrders(
  kitchen: ReadyKitchen,
): UseMutationResult<RestaurantDetail, Error, boolean> {
  const invalidate = useInvalidateRestaurant(kitchen);
  return useMutation({
    mutationFn: (isActive: boolean) =>
      services.restaurant.setAcceptingOrders(kitchen.restaurantKey, isActive),
    onSuccess: invalidate,
  });
}
