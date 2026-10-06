"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, EmptyState, buttonVariants, cn } from "@repo/ui";
import { AddressForm } from "./address-form";
import { LoadingLines, QueryError } from "./data-states";
import { useAddresses } from "../lib/queries/orders";
import { toLoginHref } from "../lib/next-path";
import type { Address } from "../lib/types";

function formatAddress(address: Address): string {
  return [address.line1, address.line2, address.city, address.pincode]
    .filter((part): part is string => part !== null && part !== undefined && part !== "")
    .join(", ");
}

/**
 * Delivery fee and distance are computed from this address, so it is picked
 * before the price is quoted, not after. Radio rows rather than a dropdown:
 * the whole address has to be readable before it is chosen.
 */
export function AddressPicker({
  userId,
  selectedId,
  onSelect,
  /** Where /login should return a signed-out visitor. */
  returnPath = "/cart",
}: {
  readonly userId: number | null;
  readonly selectedId: number | null;
  readonly onSelect: (addressId: number | null) => void;
  readonly returnPath?: string;
}): React.JSX.Element {
  const addresses = useAddresses(userId);

  /**
   * Keep the selection honest about who is ordering.
   *
   * Two cases, one rule — the chosen address must be one of *these* rows:
   *  · nothing chosen yet, so fall back to the default and let the cart price
   *    itself without the customer touching anything;
   *  · somebody else signed in on this browser, so the id sitting in the cart
   *    belongs to another account. Left alone it quotes a delivery fee for the
   *    wrong doorstep, which is worse than no price at all.
   */
  React.useEffect(() => {
    const rows = addresses.data;
    if (rows === undefined) return;

    const isSelectionValid =
      selectedId !== null && rows.some((row) => row.id === selectedId);
    if (isSelectionValid) return;

    const fallback = rows.find((row) => row.is_default) ?? rows[0];
    onSelect(fallback?.id ?? null);
  }, [addresses.data, selectedId, onSelect]);

  if (userId === null) {
    return (
      <EmptyState
        title="Sign in to choose an address"
        detail="Your saved addresses live on your account. Signing in brings you straight back here with your cart untouched."
        action={
          <Link
            href={toLoginHref(returnPath)}
            className={cn(buttonVariants({ size: "md" }), "h-11 no-underline")}
          >
            Sign in
          </Link>
        }
      />
    );
  }

  if (addresses.isPending) return <LoadingLines count={2} label="Loading addresses" />;

  if (addresses.isError) {
    return (
      <QueryError
        title="Could not load your addresses"
        error={addresses.error}
        onRetry={() => void addresses.refetch()}
      />
    );
  }

  if (addresses.data.length === 0) {
    return (
      <EmptyState
        title="No saved addresses"
        detail="Add where you would like this order delivered. It is saved to your account, so the next order only needs picking."
        action={<AddressForm userId={userId} onSaved={(saved) => onSelect(saved.id)} />}
      />
    );
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Delivery address</legend>
      {addresses.data.map((address) => {
        const isSelected = address.id === selectedId;
        return (
          <label
            key={address.id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-card border px-3 py-3",
              "transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
              isSelected
                ? "border-accent bg-accent-soft"
                : "border-line bg-surface hover:border-line-2",
            )}
          >
            <input
              type="radio"
              name="delivery-address"
              className="mt-1 size-4 shrink-0 accent-accent"
              checked={isSelected}
              onChange={() => onSelect(address.id)}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">{address.label}</span>
                {address.is_default ? (
                  <Badge tone="accent" dot={false}>
                    Default
                  </Badge>
                ) : null}
              </span>
              <span className="text-[13px] leading-snug text-ink-2">
                {formatAddress(address)}
              </span>
            </span>
          </label>
        );
      })}
      {/* A new address is selected the moment it is saved: someone who opened
          this form did it to use that address, not to file it away. */}
      <AddressForm userId={userId} onSaved={(saved) => onSelect(saved.id)} />
    </fieldset>
  );
}
