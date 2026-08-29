"use client";

import * as React from "react";
import { cn } from "../lib/cn";

export interface SegmentedOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
  /** Optional count shown after the label, e.g. live orders in that state. */
  readonly count?: number;
}

export interface SegmentedControlProps<TValue extends string> {
  readonly options: readonly SegmentedOption<TValue>[];
  readonly value: TValue;
  readonly onValueChange: (value: TValue) => void;
  readonly ariaLabel: string;
  readonly className?: string;
}

export function SegmentedControl<TValue extends string>({
  options,
  value,
  onValueChange,
  ariaLabel,
  className,
}: SegmentedControlProps<TValue>): React.JSX.Element {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full overflow-x-auto rounded-card border border-line bg-surface-2 p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-card px-3 py-1.5",
              "font-sans text-[13px] font-medium transition-colors cursor-pointer",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
              isSelected
                ? "bg-surface text-ink shadow-card"
                : "text-ink-3 hover:text-ink-2",
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className="tabular-nums text-ink-4">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
