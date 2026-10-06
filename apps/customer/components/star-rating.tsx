"use client";

import * as React from "react";
import { cn } from "@repo/ui";
import { MAX_STARS, MIN_STARS } from "../lib/reviews";

const STARS = Array.from({ length: MAX_STARS }, (_, index) => index + MIN_STARS);

/**
 * Read-only stars. Colour never carries the meaning alone (DESIGN.md), so the
 * number is printed beside them and the whole thing has a text label.
 */
export function StarRating({
  value,
  count,
  className,
}: {
  readonly value: number;
  readonly count?: number;
  readonly className?: string;
}): React.JSX.Element {
  const rounded = Math.round(value);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span aria-hidden="true" className="text-[13px] leading-none tracking-[0.1em]">
        {STARS.map((star) => (
          <span key={star} className={star <= rounded ? "text-warn" : "text-ink-3"}>
            ★
          </span>
        ))}
      </span>
      <span className="text-[12px] font-semibold tabular-nums text-ink-2">
        {value.toFixed(1)}
      </span>
      <span className="sr-only">
        {`Rated ${value.toFixed(1)} out of ${MAX_STARS}`}
      </span>
      {count !== undefined ? (
        <span className="text-[12px] tabular-nums text-ink-3">
          {`· ${count} ${count === 1 ? "review" : "reviews"}`}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The input version. A radio group, not five buttons: a rating is one choice
 * out of five, and arrow keys should move between them for free.
 */
export function StarPicker({
  name,
  label,
  value,
  onChange,
}: {
  readonly name: string;
  readonly label: string;
  readonly value: number;
  readonly onChange: (stars: number) => void;
}): React.JSX.Element {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-[13px] font-medium text-ink-2">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex items-center gap-1">
        {STARS.map((star) => {
          const isOn = star <= value;
          return (
            <label
              key={star}
              className={cn(
                "flex h-11 w-11 cursor-pointer items-center justify-center rounded-card",
                "border text-xl leading-none transition-colors",
                isOn
                  ? "border-warn/30 bg-warn-soft text-warn"
                  : "border-line bg-surface text-ink-3 hover:text-ink-2",
                "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
              )}
            >
              <input
                type="radio"
                name={name}
                value={star}
                checked={value === star}
                onChange={() => onChange(star)}
                className="sr-only"
              />
              <span aria-hidden="true">★</span>
              <span className="sr-only">
                {`${star} ${star === 1 ? "star" : "stars"}`}
              </span>
            </label>
          );
        })}
        <span className="ml-1.5 text-[13px] tabular-nums text-ink-3">
          {value > 0 ? `${value}/${MAX_STARS}` : "Not rated"}
        </span>
      </div>
    </fieldset>
  );
}
