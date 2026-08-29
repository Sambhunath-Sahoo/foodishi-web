"use client";

/**
 * Offers and coupons.
 *
 * Both lists are read with `retry: false`. Against the API these routes do not
 * exist, and the refusal says so by name — hammering a 501 three times before
 * showing that sentence just makes the screen slower to be honest.
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
import type {
  Coupon,
  CouponCreate,
  CouponPatch,
  Offer,
  OfferCreate,
  OfferPatch,
} from "../types";

function useInvalidateOffers(kitchen: ReadyKitchen): () => Promise<void> {
  const queryClient = useQueryClient();
  const { userId, restaurantId } = kitchen;
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.offers(userId, restaurantId) }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.coupons(userId, restaurantId),
      }),
    ]);
  };
}

export function useOffers(kitchen: ReadyKitchen): UseQueryResult<readonly Offer[]> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.offers(userId, restaurantId),
    retry: false,
    queryFn: ({ signal }) => services.offers.listOffers(restaurantKey, signal),
  });
}

export function useCoupons(kitchen: ReadyKitchen): UseQueryResult<readonly Coupon[]> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.coupons(userId, restaurantId),
    retry: false,
    queryFn: ({ signal }) => services.offers.listCoupons(restaurantKey, signal),
  });
}

export function useSaveOffer(
  kitchen: ReadyKitchen,
): UseMutationResult<Offer, Error, { offerId: number | null; body: OfferCreate }> {
  const invalidate = useInvalidateOffers(kitchen);
  return useMutation({
    mutationFn: ({ offerId, body }: { offerId: number | null; body: OfferCreate }) =>
      offerId === null
        ? services.offers.createOffer(kitchen.restaurantKey, body)
        : services.offers.updateOffer(offerId, body as OfferPatch),
    onSuccess: invalidate,
  });
}

export function useSetOfferActive(
  kitchen: ReadyKitchen,
): UseMutationResult<Offer, Error, { offerId: number; isActive: boolean }> {
  const invalidate = useInvalidateOffers(kitchen);
  return useMutation({
    mutationFn: ({ offerId, isActive }: { offerId: number; isActive: boolean }) =>
      services.offers.updateOffer(offerId, { is_active: isActive }),
    onSuccess: invalidate,
  });
}

export function useDeleteOffer(
  kitchen: ReadyKitchen,
): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateOffers(kitchen);
  return useMutation({
    mutationFn: (offerId: number) => services.offers.deleteOffer(offerId),
    onSuccess: invalidate,
  });
}

export function useSaveCoupon(
  kitchen: ReadyKitchen,
): UseMutationResult<Coupon, Error, { couponId: number | null; body: CouponCreate }> {
  const invalidate = useInvalidateOffers(kitchen);
  return useMutation({
    mutationFn: ({ couponId, body }: { couponId: number | null; body: CouponCreate }) =>
      couponId === null
        ? services.offers.createCoupon(kitchen.restaurantKey, body)
        : services.offers.updateCoupon(couponId, body as CouponPatch),
    onSuccess: invalidate,
  });
}

export function useSetCouponActive(
  kitchen: ReadyKitchen,
): UseMutationResult<Coupon, Error, { couponId: number; isActive: boolean }> {
  const invalidate = useInvalidateOffers(kitchen);
  return useMutation({
    mutationFn: ({ couponId, isActive }: { couponId: number; isActive: boolean }) =>
      services.offers.updateCoupon(couponId, { is_active: isActive }),
    onSuccess: invalidate,
  });
}

export function useDeleteCoupon(
  kitchen: ReadyKitchen,
): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateOffers(kitchen);
  return useMutation({
    mutationFn: (couponId: number) => services.offers.deleteCoupon(couponId),
    onSuccess: invalidate,
  });
}
