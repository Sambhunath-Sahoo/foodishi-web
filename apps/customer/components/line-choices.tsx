import * as React from "react";
import { cn } from "@repo/ui";
import { formatMoneyShort, toNumber } from "../lib/format";
import type { OrderItem } from "../lib/types";

type LineModifier = OrderItem["modifiers"][number];

/** Between two answers on the one line. */
const SEPARATOR = " · ";

/**
 * "Full plate +₹60 · No onion". A surcharge is shown beside the choice that
 * caused it, because the line's unit price already includes it and a customer
 * reading "₹121 each" for a ₹61 chai deserves to see where the ₹60 came from. Free
 * choices carry no "+₹0": a column of zeroes says nothing.
 */
export function formatLineChoices(modifiers: readonly LineModifier[]): string {
  return modifiers
    .map((modifier) =>
      toNumber(modifier.price_delta) > 0
        ? `${modifier.option_name} +${formatMoneyShort(modifier.price_delta)}`
        : modifier.option_name,
    )
    .join(SEPARATOR);
}

/**
 * The choices made for one dish, as a quiet line under its name. Renders
 * nothing for a dish that asked no questions, so a plain line looks exactly
 * as it did before choices existed.
 */
export function LineChoices({
  modifiers,
  className,
}: {
  readonly modifiers: readonly LineModifier[];
  readonly className?: string;
}): React.JSX.Element | null {
  if (modifiers.length === 0) {
    return null;
  }
  return (
    <span className={cn("block text-[13px] leading-snug text-ink-2", className)}>
      {formatLineChoices(modifiers)}
    </span>
  );
}
