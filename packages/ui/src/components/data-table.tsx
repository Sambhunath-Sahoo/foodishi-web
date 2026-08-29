import * as React from "react";
import { cn } from "../lib/cn";
import { SEVERITY_STRIPE, type SeverityTier } from "../status/severity";

/**
 * DataTable — thin wrappers that make the Command Deck row standard
 * unskippable (DENSITY.md §2). Any list above roughly six items is a table,
 * not a card grid.
 *
 * Fixed by construction, so no screen has to remember them:
 *   · 38px rows, never taller
 *   · sticky header, 10px uppercase tracked, on `--surface-2`
 *   · whole-row hover
 *   · the table scrolls sideways inside its own container, never the page
 *   · ids and timestamps in mono, money right-aligned with tabular figures
 *
 * The existing `Table` in `components/table.tsx` stays as-is for the looser
 * tables (settings, a four-row summary). Use `DataTable` for a board.
 */

const ROW_HEIGHT_CLASS = "h-[38px]";

export interface DataTableScrollProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Vertical cap in px. The sticky header only sticks against something that
   * scrolls, so a long board should set this; a short one should not.
   */
  readonly maxHeight?: number;
  /** Rendered under the scroller and inside the border — see `TableFooter`. */
  readonly footer?: React.ReactNode;
}

export function DataTableScroll({
  className,
  maxHeight,
  footer,
  children,
  ...props
}: DataTableScrollProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex w-full max-w-full flex-col overflow-hidden rounded-card border border-line bg-surface",
        className,
      )}
      {...props}
    >
      <div
        className="w-full max-w-full overflow-x-auto overflow-y-auto"
        style={maxHeight === undefined ? undefined : { maxHeight }}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}

export type DataTableProps = React.HTMLAttributes<HTMLTableElement>;

export function DataTable({
  className,
  ...props
}: DataTableProps): React.JSX.Element {
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

export function DataTableHead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>): React.JSX.Element {
  return <thead className={cn("text-ink-3", className)} {...props} />;
}

export function DataTableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>): React.JSX.Element {
  return <tbody className={cn("divide-y divide-line", className)} {...props} />;
}

export interface DataTableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  /** A row the reader has drilled into. Reads as ground, not as a highlight. */
  readonly selected?: boolean;
}

/** 38px, whole-row hover. Height lives here so no cell can quietly grow it. */
export function DataTableRow({
  className,
  selected = false,
  ...props
}: DataTableRowProps): React.JSX.Element {
  return (
    <tr
      aria-selected={selected ? true : undefined}
      className={cn(
        ROW_HEIGHT_CLASS,
        "transition-colors hover:bg-surface-2",
        selected && "bg-accent-soft",
        className,
      )}
      {...props}
    />
  );
}

export interface DataTableHeaderCellProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Money and any column of digits: right-aligned, tabular figures. */
  readonly numeric?: boolean;
}

export function DataTableHeaderCell({
  className,
  numeric = false,
  ...props
}: DataTableHeaderCellProps): React.JSX.Element {
  return (
    <th
      scope="col"
      className={cn(
        "sticky top-0 z-10 border-b border-line bg-surface-2 px-3 py-2",
        "text-[10px] font-bold tracking-[0.07em] whitespace-nowrap uppercase",
        numeric && "text-right tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

export interface DataTableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** Money and any column of digits: right-aligned, tabular figures. */
  readonly numeric?: boolean;
  /** Order ids, timestamps and provider refs render in IBM Plex Mono. */
  readonly mono?: boolean;
  /** Let one long column wrap. Off by default — 38px rows do not wrap. */
  readonly wrap?: boolean;
}

export function DataTableCell({
  className,
  numeric = false,
  mono = false,
  wrap = false,
  ...props
}: DataTableCellProps): React.JSX.Element {
  return (
    <td
      className={cn(
        "px-3 py-0 align-middle",
        wrap ? "whitespace-normal" : "truncate whitespace-nowrap",
        numeric && "text-right tabular-nums",
        mono && "font-mono text-[12px] text-ink-2",
        className,
      )}
      {...props}
    />
  );
}

export interface SeverityCellProps extends DataTableCellProps {
  /** From `lateTier(minutesLate)`. Tier 0 draws no rule. */
  readonly tier: SeverityTier;
}

/**
 * The leading cell of a graded row: a 3px rule inset 5px vertically, never a
 * full border and never a background wash (DENSITY.md §3). Tier 0 keeps the
 * indent and draws nothing — a rule on every row is decoration, not a signal.
 */
export function SeverityCell({
  tier,
  className,
  ...props
}: SeverityCellProps): React.JSX.Element {
  return (
    <DataTableCell
      className={cn(
        "relative pl-4",
        tier !== 0 && [
          "before:absolute before:inset-y-[5px] before:left-0",
          "before:w-[3px] before:rounded-[2px] before:content-['']",
          SEVERITY_STRIPE[tier],
        ],
        className,
      )}
      {...props}
    />
  );
}

export interface TableFooterProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Rows on screen right now. */
  readonly shown: number;
  /** Rows the filter matched in total. */
  readonly total: number;
  /** Plural noun for the rows, e.g. "live orders". */
  readonly noun?: string;
  /** Plain words, never a column name: "minutes past promised". */
  readonly sortedBy?: string;
  /** "updated 3s ago", or a `<LiveDot>` that keeps counting. */
  readonly updated?: React.ReactNode;
  /** Anything else worth stating, appended after the standard parts. */
  readonly extra?: React.ReactNode;
}

/**
 * "8 of 125 live orders · sorted by minutes past promised · updated 3s ago".
 * A list that does not say what it is showing and why is asking the reader to
 * guess (DENSITY.md §5).
 */
export function TableFooter({
  shown,
  total,
  noun,
  sortedBy,
  updated,
  extra,
  className,
  ...props
}: TableFooterProps): React.JSX.Element {
  const count = noun === undefined ? `${shown} of ${total}` : `${shown} of ${total} ${noun}`;
  const parts: React.ReactNode[] = [
    <span key="count" className="tabular-nums">
      {count}
    </span>,
  ];
  if (sortedBy !== undefined) parts.push(<span key="sort">sorted by {sortedBy}</span>);
  if (updated !== undefined) parts.push(<span key="updated">{updated}</span>);
  if (extra !== undefined) parts.push(<span key="extra">{extra}</span>);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line bg-surface-2",
        "px-3 py-1.5 font-sans text-[11px] text-ink-3",
        className,
      )}
      {...props}
    >
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {index > 0 ? (
            <span aria-hidden="true" className="text-ink-4">
              ·
            </span>
          ) : null}
          {part}
        </React.Fragment>
      ))}
    </div>
  );
}
