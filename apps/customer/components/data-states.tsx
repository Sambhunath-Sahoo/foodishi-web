"use client";

import * as React from "react";
import { EmptyState, ErrorBanner, Skeleton, cn } from "@repo/ui";
import { toUserMessage } from "@repo/api-client";

/**
 * Every data-driven view on this app owes the customer three honest states.
 * This is the one place they are spelled, so none of them can be forgotten.
 */
export function LoadingCards({
  count = 3,
  className,
}: {
  readonly count?: number;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton
          key={index}
          className="h-28 w-full"
          label="Loading kitchens"
        />
      ))}
    </div>
  );
}

export function LoadingLines({
  count = 4,
  label = "Loading",
}: {
  readonly count?: number;
  readonly label?: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" label={label} />
      ))}
    </div>
  );
}

/**
 * The server writes its failures for humans. Print the `detail` verbatim —
 * "Order must be at least 599 to use this coupon" tells someone what to do;
 * "Something went wrong" does not.
 */
export function QueryError({
  error,
  title,
  onRetry,
}: {
  readonly error: unknown;
  readonly title?: string;
  readonly onRetry?: () => void;
}): React.JSX.Element {
  return (
    <ErrorBanner
      title={title}
      message={toUserMessage(error)}
      action={
        onRetry !== undefined ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-card border border-crit px-2.5 py-1 text-[12px] font-medium text-crit"
          >
            Try again
          </button>
        ) : undefined
      }
    />
  );
}

export { EmptyState };
