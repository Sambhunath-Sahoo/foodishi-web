"use client";

import * as React from "react";
import Link from "next/link";
import { EmptyState, ErrorBanner, Skeleton, buttonVariants, cn } from "@repo/ui";
import { isRetryable, toUserMessage } from "@repo/api-client";

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
 *
 * "Try again" appears only when asking again could change the answer. A 404 or
 * a 501 is the same on the hundredth tap, and a button that can never work is
 * worse than none — so a caller may always pass onRetry, and this decides.
 */
export function QueryError({
  error,
  title,
  onRetry,
  formatMessage,
}: {
  readonly error: unknown;
  readonly title?: string;
  readonly onRetry?: () => void;
  /** Tidies the server's sentence without replacing it — see withRupee. */
  readonly formatMessage?: (message: string) => string;
}): React.JSX.Element {
  const canRetry = onRetry !== undefined && isRetryable(error);
  const message = toUserMessage(error);
  return (
    <ErrorBanner
      title={title}
      message={formatMessage === undefined ? message : formatMessage(message)}
      action={
        canRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-card border border-crit px-3 text-[13px] font-medium text-crit"
          >
            Try again
          </button>
        ) : undefined
      }
    />
  );
}

/**
 * The record asked for is not there — a mistyped link, a kitchen that left, an
 * order number that was never ours. That is a fact, not a failure, so it is a
 * calm empty state with a way out rather than a red banner with a retry.
 */
export function NotFoundState({
  title,
  detail,
  backHref,
  backLabel,
}: {
  readonly title: string;
  readonly detail: string;
  readonly backHref: string;
  readonly backLabel: string;
}): React.JSX.Element {
  return (
    <EmptyState
      title={title}
      detail={detail}
      action={
        <Link
          href={backHref}
          className={cn(
            buttonVariants({ variant: "outline", size: "md" }),
            "h-11 no-underline",
          )}
        >
          {backLabel}
        </Link>
      }
    />
  );
}

export { EmptyState };
