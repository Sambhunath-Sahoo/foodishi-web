"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { CouponRead, Page } from "../api-types";
import { services } from "../services";
import type { CouponInput, CouponPatch } from "../services/types";
import { keys } from "./keys";
import { METRICS_STALE_MS } from "./metrics";

/**
 * Coupons and platform-wide offers — one record, three scopes.
 *
 * Every write invalidates the whole coupon tree rather than patching one row in
 * place: creating a code can invalidate the uniqueness of another, and an
 * optimistic update that guessed at `times_used` would be inventing a number.
 */
export function useCoupons(): UseQueryResult<Page<CouponRead>> {
  return useQuery({
    queryKey: keys.coupons.list(),
    queryFn: () => services.offers.listCoupons(),
    staleTime: METRICS_STALE_MS,
  });
}

export function useCreateCoupon(): UseMutationResult<CouponRead, Error, CouponInput> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CouponInput) => services.offers.createCoupon(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.coupons.all });
    },
  });
}

export interface UpdateCouponInput {
  readonly couponId: number;
  readonly patch: CouponPatch;
}

export function useUpdateCoupon(): UseMutationResult<
  CouponRead,
  Error,
  UpdateCouponInput
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ couponId, patch }: UpdateCouponInput) =>
      services.offers.updateCoupon(couponId, patch),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.coupons.all });
    },
  });
}

export interface SetCouponActiveInput {
  readonly couponId: number;
  readonly isActive: boolean;
}

export function useSetCouponActive(): UseMutationResult<
  CouponRead,
  Error,
  SetCouponActiveInput
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ couponId, isActive }: SetCouponActiveInput) =>
      services.offers.setCouponActive(couponId, isActive),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.coupons.all });
    },
  });
}
