import * as React from "react";
import { cn, Skeleton } from "@repo/ui";
import { DECK_PANEL } from "../lib/deck";

/**
 * Loading states shaped like the thing that is loading.
 *
 * A flat 420px grey rectangle is the same band of dead space the density
 * standard exists to remove — and the refund walk can sit behind one for half
 * a minute. These draw the frame, the header and the row pitch the real board
 * will land on, so nothing jumps when the data arrives and the reader can see
 * how much is coming.
 */

/** 10px header band + 38px rows: the same pitch as a real `DataTable`. */
const HEADER_HEIGHT = "h-[33px]";
const ROW_HEIGHT = "h-[38px]";

export interface BoardSkeletonProps {
  /** How many row placeholders to draw. */
  readonly rows?: number;
  /** Announced while the rows are in flight. */
  readonly label: string;
  /** One line under the frame, e.g. "Reading refunds one by one…". */
  readonly note?: string;
  /** Fill the deck, like the board it stands in for. */
  readonly fill?: boolean;
  readonly className?: string;
}

export function BoardSkeleton({
  rows = 8,
  label,
  note,
  fill = true,
  className,
}: BoardSkeletonProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-card border border-line bg-surface",
        fill && DECK_PANEL,
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className={cn("border-b border-line bg-surface-2", HEADER_HEIGHT)} />
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-6 border-b border-line px-3",
              ROW_HEIGHT,
            )}
          >
            <Skeleton className="h-3 w-14 shrink-0" label="" />
            <Skeleton className="h-3 w-40 shrink-0" label="" />
            <Skeleton className="h-3 w-24 shrink-0" label="" />
            <Skeleton className="ml-auto h-3 w-16 shrink-0" label="" />
          </div>
        ))}
      </div>
      <div className="border-t border-line bg-surface-2 px-3 py-1.5 font-sans text-[11px] text-ink-3">
        {note ?? "Counting…"}
      </div>
    </div>
  );
}

/** The 60px rail, before its numbers land. */
export function RailSkeleton({
  label,
  cells = 5,
}: {
  readonly label: string;
  readonly cells?: number;
}): React.JSX.Element {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex h-[62px] w-full shrink-0 divide-x divide-line overflow-hidden rounded-card border border-line bg-surface"
    >
      {Array.from({ length: cells }, (_, index) => (
        <div
          key={index}
          className="flex flex-1 flex-col justify-center gap-2 px-3.5"
        >
          <Skeleton className="h-2 w-20" label="" />
          <Skeleton className="h-4 w-12" label="" />
        </div>
      ))}
    </div>
  );
}
