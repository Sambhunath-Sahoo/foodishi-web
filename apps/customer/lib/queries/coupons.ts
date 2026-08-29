"use client";

import { useMutation } from "@tanstack/react-query";
import { services } from "../services";
import type { CouponValidation } from "../types";

export interface ValidateCouponInput {
  readonly code: string;
  readonly restaurantId: number;
  readonly userId: number;
  /** The decimal string from the current quote, not a locally added total. */
  readonly subtotal: string;
}

/**
 * Checked before it is applied, so the refusal reason is the server's own
 * sentence — "Order must be at least 599.00 to use this coupon" — rather than
 * a generic "invalid coupon" the customer cannot act on.
 */
export function useValidateCoupon() {
  return useMutation<CouponValidation, unknown, ValidateCouponInput>({
    mutationFn: (command) => services.orders.validateCoupon(command),
  });
}
