"use client";

import * as React from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { toUserMessage } from "@repo/api-client";
import { Button, EmptyState, ErrorBanner } from "@repo/ui";

export interface QueryStateProps<TData> {
  readonly query: UseQueryResult<TData>;
  /** Shaped like the thing that is loading, not a generic spinner. */
  readonly skeleton: React.ReactNode;
  /** Say what would appear here. Required — a blank panel explains nothing. */
  readonly emptyTitle: string;
  readonly emptyDetail?: string;
  /**
   * Rendered above the empty state, for the controls that produced it — a
   * search or a filter that matched nothing has to stay on screen to be undone.
   */
  readonly emptyLead?: React.ReactNode;
  /**
   * The one control that brings rows back, inside the empty state. "Widen the
   * window" as a sentence beside a window that would have worked is advice the
   * reader has to act on themselves; a button with the count on it is the
   * answer (OP-5). Omit it when there is nothing wider to offer.
   */
  readonly emptyAction?: React.ReactNode;
  readonly isEmpty?: (data: TData) => boolean;
  /** Names the failing view: "Today's numbers could not load". */
  readonly errorTitle: string;
  readonly children: (data: TData) => React.ReactNode;
}

/**
 * Loading, error and empty for every data-driven view, in one place so all six
 * pages fail the same way.
 *
 * The error path prints the server's own `detail` verbatim — the API writes
 * those for humans ("Order must be at least 599 to use this coupon"), and
 * replacing one with "Something went wrong" throws away the only useful part.
 */
export function QueryState<TData>({
  query,
  skeleton,
  emptyTitle,
  emptyDetail,
  emptyLead,
  emptyAction,
  isEmpty,
  errorTitle,
  children,
}: QueryStateProps<TData>): React.JSX.Element {
  if (query.isPending) return <>{skeleton}</>;

  if (query.isError) {
    return (
      <ErrorBanner
        title={errorTitle}
        message={toUserMessage(query.error)}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? "Retrying…" : "Retry"}
          </Button>
        }
      />
    );
  }

  const data = query.data;
  if (data === undefined) {
    return (
      <ErrorBanner
        title={errorTitle}
        message="The request finished but returned nothing to show."
      />
    );
  }

  if (isEmpty?.(data) === true) {
    return (
      <>
        {emptyLead}
        <EmptyState title={emptyTitle} detail={emptyDetail} action={emptyAction} />
      </>
    );
  }

  return <>{children(data)}</>;
}

/**
 * A quiet marker for a view that is refreshing in the background. The live
 * board repolls every 15s and the rows must not flash back to skeletons.
 */
export function RefreshingDot({
  isFetching,
  label = "Refreshing",
}: {
  readonly isFetching: boolean;
  readonly label?: string;
}): React.JSX.Element | null {
  if (!isFetching) return null;
  return (
    <span className="inline-flex items-center gap-1.5 font-sans text-[11px] text-ink-3">
      <span
        aria-hidden="true"
        className="size-1.5 animate-pulse rounded-chip bg-accent"
      />
      {label}
    </span>
  );
}
