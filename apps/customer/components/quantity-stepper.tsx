"use client";

import * as React from "react";
import { cn } from "@repo/ui";

const CONTROL = [
  "inline-flex size-9 items-center justify-center rounded-card",
  "text-base font-semibold leading-none text-accent",
  "transition-colors cursor-pointer",
  "hover:bg-accent-soft disabled:cursor-not-allowed disabled:text-ink-4",
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
].join(" ");

/**
 * 36px targets, because this is tapped with a thumb. The count is announced
 * politely so a screen reader hears the new quantity without stealing focus.
 */
export function QuantityStepper({
  quantity,
  itemName,
  min = 0,
  max,
  onChange,
  className,
}: {
  readonly quantity: number;
  readonly itemName: string;
  readonly min?: number;
  readonly max: number;
  readonly onChange: (next: number) => void;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-card border border-accent/40 bg-accent-soft",
        className,
      )}
    >
      <button
        type="button"
        className={CONTROL}
        disabled={quantity <= min}
        aria-label={`Remove one ${itemName}`}
        onClick={() => onChange(quantity - 1)}
      >
        −
      </button>
      <span
        aria-live="polite"
        className="min-w-6 text-center text-sm font-semibold tabular-nums text-accent"
      >
        {quantity}
      </span>
      <button
        type="button"
        className={CONTROL}
        disabled={quantity >= max}
        aria-label={`Add one more ${itemName}`}
        onClick={() => onChange(quantity + 1)}
      >
        +
      </button>
    </div>
  );
}
