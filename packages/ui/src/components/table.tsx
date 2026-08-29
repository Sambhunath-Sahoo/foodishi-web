import * as React from "react";
import { cn } from "../lib/cn";
import { TONE_ROW_STRIPE, type Tone } from "../status/tone";

/**
 * Wide content scrolls inside its own container (DESIGN.md non-negotiable #4).
 * The page body never scrolls sideways, so every Table is wrapped here.
 */
export function TableScroll({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        "w-full max-w-full overflow-x-auto rounded-card border border-line bg-surface",
        className,
      )}
      {...props}
    />
  );
}

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** Set on the caption-less tables the operator board uses. */
  readonly "aria-label"?: string;
}

export function Table({ className, ...props }: TableProps): React.JSX.Element {
  return (
    <table
      className={cn(
        "w-full border-collapse text-left font-sans text-[13px] text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>): React.JSX.Element {
  return (
    <thead
      className={cn("bg-surface-2 text-ink-3", className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>): React.JSX.Element {
  return <tbody className={cn("divide-y divide-line", className)} {...props} />;
}

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  /** An urgent row carries a severity stripe, never colour alone. */
  readonly stripe?: Tone;
}

export function TableRow({
  className,
  stripe,
  ...props
}: TableRowProps): React.JSX.Element {
  return (
    <tr
      className={cn(
        "relative hover:bg-surface-2",
        stripe !== undefined && [
          "[&>td:first-child]:relative",
          "[&>td:first-child]:before:absolute [&>td:first-child]:before:inset-y-0",
          "[&>td:first-child]:before:left-0 [&>td:first-child]:before:w-[3px]",
          "[&>td:first-child]:before:content-['']",
          TONE_ROW_STRIPE[stripe],
        ],
        className,
      )}
      {...props}
    />
  );
}

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** Money and any column of digits: right-aligned, tabular figures. */
  readonly numeric?: boolean;
  /** Order ids, timestamps and provider refs render in IBM Plex Mono. */
  readonly mono?: boolean;
}

export interface TableHeaderCellProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Money and any column of digits: right-aligned, tabular figures. */
  readonly numeric?: boolean;
}

export function TableHeaderCell({
  className,
  numeric = false,
  ...props
}: TableHeaderCellProps): React.JSX.Element {
  return (
    <th
      scope="col"
      className={cn(
        "px-3 py-2 text-[11px] font-semibold uppercase tracking-wide",
        numeric && "text-right tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  numeric = false,
  mono = false,
  ...props
}: TableCellProps): React.JSX.Element {
  return (
    <td
      className={cn(
        "px-3 py-2 align-middle",
        numeric && "text-right tabular-nums",
        mono && "font-mono text-[12px] text-ink-2",
        className,
      )}
      {...props}
    />
  );
}
