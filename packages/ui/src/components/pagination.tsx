"use client";

import * as React from "react";
import { Button } from "./button";
import { cn } from "../lib/cn";

export interface PaginationProps {
  /** Matches the API list contract: { items, total, limit, offset }. */
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly onOffsetChange: (offset: number) => void;
  /** Plural noun for the row count, e.g. "orders". */
  readonly noun?: string;
  readonly className?: string;
}

export function Pagination({
  total,
  limit,
  offset,
  onOffsetChange,
  noun = "rows",
  className,
}: PaginationProps): React.JSX.Element {
  const safeLimit = Math.max(1, limit);
  const first = total === 0 ? 0 : offset + 1;
  const last = Math.min(offset + safeLimit, total);
  const hasPrevious = offset > 0;
  const hasNext = last < total;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-3 py-2",
        className,
      )}
    >
      <p className="font-sans text-[12px] text-ink-3">
        <span className="tabular-nums">{first}</span>
        {"–"}
        <span className="tabular-nums">{last}</span> of{" "}
        <span className="tabular-nums">{total}</span> {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrevious}
          onClick={() => onOffsetChange(Math.max(0, offset - safeLimit))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onOffsetChange(offset + safeLimit)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
