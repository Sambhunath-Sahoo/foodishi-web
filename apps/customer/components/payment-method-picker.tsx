"use client";

import * as React from "react";
import { cn } from "@repo/ui";
import { PAYMENT_METHODS, type PaymentMethod } from "../lib/payment";

/**
 * How to pay, chosen before the order is placed.
 *
 * Radio rows rather than a dropdown, for the reason address-picker.tsx gives:
 * every option carries a sentence about what happens to the money — held now,
 * or nothing until the door — and a sentence cannot be read inside a <select>.
 */
export function PaymentMethodPicker({
  value,
  onChange,
  className,
}: {
  readonly value: PaymentMethod;
  readonly onChange: (method: PaymentMethod) => void;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      <legend className="sr-only">Payment method</legend>
      {PAYMENT_METHODS.map((option) => {
        const isSelected = option.value === value;
        return (
          <label
            key={option.value}
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
              name="payment-method"
              className="mt-0.5 size-4 shrink-0 accent-accent"
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold text-ink">{option.label}</span>
              <span className="text-[13px] leading-snug text-ink-2">
                {option.hint}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
