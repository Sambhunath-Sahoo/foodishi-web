"use client";

import * as React from "react";
import { cn, DataTableHeaderCell } from "@repo/ui";
import { sortIndicator, type SortState } from "../lib/sort";

export interface SortableHeaderProps<TKey extends string> {
  readonly sortKey: TKey;
  readonly sort: SortState<TKey>;
  readonly onSort: (key: TKey) => void;
  readonly numeric?: boolean;
  readonly className?: string;
  readonly children: React.ReactNode;
}

/**
 * A Command Deck column header that sorts. `aria-sort` goes on the th so a
 * screen reader announces the state, and the arrow is text rather than colour.
 */
export function SortableHeader<TKey extends string>({
  sortKey,
  sort,
  onSort,
  numeric = false,
  className,
  children,
}: SortableHeaderProps<TKey>): React.JSX.Element {
  const { isActive, ariaSort } = sortIndicator(sort, sortKey);

  return (
    <DataTableHeaderCell
      numeric={numeric}
      aria-sort={ariaSort}
      className={cn("p-0", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-1 px-3 py-2",
          "text-[10px] font-bold tracking-[0.07em] uppercase",
          "hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
          numeric && "justify-end",
          isActive ? "text-accent" : "text-ink-3",
        )}
      >
        {children}
        <span aria-hidden="true" className="font-mono text-[9px]">
          {isActive ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </DataTableHeaderCell>
  );
}
