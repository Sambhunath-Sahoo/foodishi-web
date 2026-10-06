import * as React from "react";
import { cn } from "../lib/cn";
import { FIELD_BASE } from "./input";

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  readonly options: readonly SelectOption[];
  readonly placeholder?: string;
  readonly error?: string;
}

/**
 * A native select on purpose: partner runs on a tablet and customer on a
 * phone, where the platform picker beats anything we would draw.
 *
 * `appearance-none` strips the platform arrow so the field matches `Input`,
 * which means we owe the reader our own chevron — without it a select reads
 * as a text box (SH-1).
 *
 * The chevron is a flex sibling pulled back over the select's right padding
 * rather than an absolute child of a `relative` box. Callers size the select
 * itself (`w-[150px]`, `w-full` from FIELD_BASE) inside flex rows, columns
 * and blocks; a full-width wrapper would park an absolute chevron at the
 * wrapper's edge, not the select's. As a flex sibling it always lands 12px
 * inside whatever edge the select ends at, and its margins net to zero so
 * the wrapper is exactly as wide as the select.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, options, placeholder, error, id, ...props }, ref) {
    const errorId = error !== undefined && id !== undefined ? `${id}-error` : undefined;
    return (
      <>
        <span className="flex items-center">
          <select
            ref={ref}
            id={id}
            aria-invalid={error !== undefined || undefined}
            aria-describedby={errorId}
            className={cn(
              FIELD_BASE,
              "peer h-10 appearance-none pr-8",
              error !== undefined ? "border-crit" : "border-line-2",
              className,
            )}
            {...props}
          >
            {placeholder !== undefined ? (
              <option value="">{placeholder}</option>
            ) : null}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {/* 16px glyph, 12px in from the edge: 28px of the select's 32px pr-8,
              so the longest label stops short of it. Clicks fall through to
              the select, so the arrow opens the picker like the platform's. */}
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none -ml-7 mr-3 size-4 shrink-0 text-ink-3 peer-disabled:text-ink-4"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
        {error !== undefined ? (
          <p id={errorId} className="mt-1 text-[12px] text-crit">
            {error}
          </p>
        ) : null}
      </>
    );
  },
);
