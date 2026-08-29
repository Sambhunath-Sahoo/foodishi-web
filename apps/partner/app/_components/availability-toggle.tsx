"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { TONE_DOT, TONE_SOFT, cn } from "@repo/ui";
import { ROLE_LABELS } from "../../lib/permissions";
import { useSetItemAvailability } from "../../lib/queries/menu";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { MenuItem } from "../../lib/types";

export interface AvailabilityToggleProps {
  readonly item: MenuItem;
  readonly kitchen: ReadyKitchen;
  /**
   * Inside the menu table. Still a 44px tap — touch targets do not shrink
   * because a row is dense — but it stops setting the row height on its own and
   * drops the consequence line to a tooltip.
   */
  readonly compact?: boolean;
}

/**
 * The one menu control a kitchen touches mid-service. Big enough to hit without
 * looking, and it says what the tap will do before it happens — the state word
 * on top, the consequence underneath.
 *
 * Selling a dish out is its OWN permission (`menu.availability`), and a shift
 * worker holds it by default. That is the whole point: a dish that ran out at
 * eight in the evening is service work, and routing it through a manager means
 * it stays on the menu until somebody answers their phone. Renaming a dish or
 * repricing it is a different permission entirely.
 */
export function AvailabilityToggle({
  item,
  kitchen,
  compact = false,
}: AvailabilityToggleProps): React.JSX.Element {
  const mutation = useSetItemAvailability(kitchen);
  const canFlip = kitchen.can("menu.availability");

  const tone = item.is_available ? "ok" : "crit";
  const stateWord = item.is_available ? "Available" : "Sold out";

  function describeTap(): string {
    if (mutation.isPending) return "Saving…";
    if (!canFlip) {
      return `Not part of your access — you are ${ROLE_LABELS[kitchen.role].toLowerCase()}`;
    }
    return item.is_available ? "Tap to mark sold out" : "Tap to put it back";
  }

  function compactHint(): string {
    if (mutation.isPending) return "saving…";
    if (!canFlip) return "read-only";
    return item.is_available ? "tap to sell out" : "tap to restore";
  }

  const consequence = describeTap();

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-stretch gap-1",
        compact ? "w-[132px]" : "w-44",
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={item.is_available}
        aria-label={
          item.is_available
            ? `Mark ${item.name} sold out`
            : `Put ${item.name} back on the menu`
        }
        title={compact ? consequence : undefined}
        aria-busy={mutation.isPending || undefined}
        disabled={mutation.isPending || !canFlip}
        onClick={() => {
          mutation.mutate({ itemId: item.id, isAvailable: !item.is_available });
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-card border",
          "cursor-pointer font-sans transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "disabled:cursor-not-allowed disabled:opacity-60",
          compact ? "min-h-11 gap-0 px-2 py-1" : "min-h-14 gap-0.5 px-3 py-2",
          TONE_SOFT[tone],
        )}
      >
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-2 shrink-0 rounded-chip", TONE_DOT[tone])}
          />
          <span
            className={cn(
              "font-semibold",
              compact ? "text-[13px] leading-tight" : "text-[15px]",
            )}
          >
            {stateWord}
          </span>
        </span>
        <span
          className={cn(
            "font-normal",
            compact ? "text-[10px] leading-tight" : "text-[12px]",
          )}
        >
          {compact ? compactHint() : consequence}
        </span>
      </button>

      {mutation.error !== null ? (
        <p role="alert" className="text-[11px] leading-snug text-crit">
          {toUserMessage(mutation.error)}
        </p>
      ) : null}
    </div>
  );
}
