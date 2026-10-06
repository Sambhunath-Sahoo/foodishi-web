import * as React from "react";
import { cn } from "@repo/ui";
import type { OrderItem } from "../../lib/types";

type LineModifier = OrderItem["modifiers"][number];

/** Between two answers on the one secondary line. */
const SEPARATOR = " · ";

export interface OrderLineModifiersProps {
  readonly modifiers: readonly LineModifier[];
  /** Left padding in px, so the line starts under the dish name, not the photo. */
  readonly indent: number;
  readonly compact?: boolean;
}

/** "Full plate · No onion" — the answers only, in the order the API sent them. */
export function formatModifiers(modifiers: readonly LineModifier[]): string {
  return modifiers.map((modifier) => modifier.option_name).join(SEPARATOR);
}

/** "Portion: Full plate, Add-ons: No onion" — the same answers with their questions. */
function describeModifiers(modifiers: readonly LineModifier[]): string {
  return modifiers
    .map((modifier) => `${modifier.group_name}: ${modifier.option_name}`)
    .join(", ");
}

/**
 * What the customer chose for this dish, as one line under its name.
 *
 * "2× Masala Chai" is not a ticket. "Full plate · No onion" is what the cook
 * actually has to do differently, so it sits directly under the name in
 * ink-2: quieter than the dish, louder than the note's label, and never
 * trimmed — a card that hid "Full plate" would send out the wrong food.
 *
 * Only the answers are printed. The question ("Portion", "Add-ons") is a
 * second word per choice competing for the same two-feet glance, and the
 * answers already say what they are. Screen readers and a hover get the full
 * "Portion: Full plate" through the label. No money either: like the rest of the
 * row, the surcharge is already in the order's total.
 */
export function OrderLineModifiers({
  modifiers,
  indent,
  compact = false,
}: OrderLineModifiersProps): React.JSX.Element | null {
  if (modifiers.length === 0) {
    return null;
  }
  const described = describeModifiers(modifiers);
  return (
    <p
      // 14px on a card and the detail screen, a point under the dish name: at
      // 13 "No onion" was the one line on the ticket a cook leaned in to read
      // from two feet. The board's narrow columns keep 13.
      className={cn("leading-snug text-ink-2", compact ? "text-[13px]" : "text-[14px]")}
      style={{ paddingLeft: indent }}
      title={described}
    >
      <span className="sr-only">Chosen: {described}</span>
      <span aria-hidden="true">{formatModifiers(modifiers)}</span>
    </p>
  );
}
