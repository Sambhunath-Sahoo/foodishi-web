import * as React from "react";
import { cn } from "../lib/cn";

const FIELD_BASE = [
  "w-full rounded-card border bg-surface px-3 text-sm text-ink font-sans",
  "placeholder:text-ink-4",
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
  "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-4",
];

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Renders the server's own validation message under the field. */
  readonly error?: string;
  /** Ids, refs and amounts read better in IBM Plex Mono. */
  readonly mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, error, mono = false, id, ...props }, ref) {
    const errorId = error !== undefined && id !== undefined ? `${id}-error` : undefined;
    return (
      <>
        <input
          ref={ref}
          id={id}
          aria-invalid={error !== undefined || undefined}
          aria-describedby={errorId}
          className={cn(
            FIELD_BASE,
            "h-10",
            mono && "font-mono tabular-nums",
            error !== undefined ? "border-crit" : "border-line-2",
            className,
          )}
          {...props}
        />
        {error !== undefined ? (
          <p id={errorId} className="mt-1 text-[12px] text-crit">
            {error}
          </p>
        ) : null}
      </>
    );
  },
);

export interface FieldProps {
  readonly label: string;
  readonly htmlFor: string;
  readonly hint?: string;
  readonly children: React.ReactNode;
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: FieldProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="font-sans text-[13px] font-medium text-ink-2"
      >
        {label}
      </label>
      {children}
      {hint !== undefined ? (
        <p className="text-[12px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export { FIELD_BASE };
