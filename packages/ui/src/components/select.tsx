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
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, options, placeholder, error, id, ...props }, ref) {
    const errorId = error !== undefined && id !== undefined ? `${id}-error` : undefined;
    return (
      <>
        <select
          ref={ref}
          id={id}
          aria-invalid={error !== undefined || undefined}
          aria-describedby={errorId}
          className={cn(
            FIELD_BASE,
            "h-10 appearance-none pr-8",
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
        {error !== undefined ? (
          <p id={errorId} className="mt-1 text-[12px] text-crit">
            {error}
          </p>
        ) : null}
      </>
    );
  },
);
