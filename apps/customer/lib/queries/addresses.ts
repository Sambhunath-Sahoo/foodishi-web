"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { services } from "../services";
import type { Address, AddressCreate } from "../types";

/**
 * Save a new delivery address.
 *
 * POST /users/{id}/addresses is guarded by readable_user, so it only ever
 * accepts the signed-in customer's own id — the same rule the list read
 * follows. `userId` is therefore the caller's profile id, never a value from
 * the page.
 *
 * The API decides is_default: the first address on an account becomes the
 * default, and changing it afterwards is PUT /addresses/{id}/default, which
 * clears the previous one in the same transaction. So nothing here sends it,
 * and AddressCreate's extra="forbid" would reject it anyway.
 */
export function useCreateAddress(
  userId: number | null,
): UseMutationResult<Address, Error, AddressCreate> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddressCreate) => {
      if (userId === null) {
        // Should be unreachable — the form is only rendered for a signed-in
        // customer — but a thrown Error here beats a request to /users/null.
        throw new Error("Sign in before saving an address.");
      }
      return services.orders.createAddress(userId, payload);
    },
    onSuccess: () => {
      // The list is keyed by profile id, so this is the only key to touch.
      void client.invalidateQueries({ queryKey: ["addresses", userId] });
    },
  });
}
