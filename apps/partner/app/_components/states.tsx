"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { Button, Card, EmptyState, ErrorBanner, Skeleton } from "@repo/ui";
import { isPermanentRefusal } from "../_lib/refusal";

/** Card-shaped placeholders, so the queue does not jump when it arrives. */
export function CardSkeletons({
  count = 3,
  label = "Loading orders",
}: {
  readonly count?: number;
  readonly label?: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="p-4">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-40" label={label} />
            <Skeleton className="h-4 w-64" label={label} />
            <Skeleton className="h-4 w-52" label={label} />
            <Skeleton className="h-14 w-full" label={label} />
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * A door that is shut by design, stated once and quietly.
 *
 * No red, no "Try again": the tap could only ever be refused again, and a
 * permanent refusal drawn as loudly as a broken request means neither carries
 * information (DENSITY.md §1).
 */
export function RefusedNote({
  title,
  detail,
}: {
  readonly title: string;
  readonly detail: string;
}): React.JSX.Element {
  return (
    <p className="flex items-start gap-2 rounded-card border border-line bg-surface-2 px-3 py-2 text-[13px] leading-snug text-ink-3">
      <span
        aria-hidden="true"
        className="mt-1.5 size-1.5 shrink-0 rounded-chip bg-ink-4"
      />
      <span>
        <span className="font-medium text-ink-2">{title}</span> — {detail}
      </span>
    </p>
  );
}

/**
 * The server writes its failures for humans — "Requires manager access to
 * restaurant 1" — so the message goes through verbatim.
 *
 * A refusal that will never turn into a success is the one exception: it is
 * not a failure to retry, so it drops to `RefusedNote` and the retry with it.
 * Every screen renders its errors through here, so no screen can disagree.
 */
export function LoadError({
  error,
  title,
  onRetry,
  refusedTitle,
}: {
  readonly error: unknown;
  readonly title: string;
  readonly onRetry?: () => void;
  /** What to say instead of `title` when the door is shut by design. */
  readonly refusedTitle?: string;
}): React.JSX.Element {
  if (isPermanentRefusal(error)) {
    return (
      <RefusedNote
        title={refusedTitle ?? title}
        detail={toUserMessage(error)}
      />
    );
  }

  return (
    <ErrorBanner
      title={title}
      message={toUserMessage(error)}
      action={
        onRetry !== undefined ? (
          <Button variant="outline" size="sm" className="min-h-11" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
    />
  );
}

/** An empty state inside a card, which is how every page shows "nothing here". */
export function EmptyCard({
  title,
  detail,
}: {
  readonly title: string;
  readonly detail: string;
}): React.JSX.Element {
  return (
    <Card>
      <EmptyState title={title} detail={detail} />
    </Card>
  );
}
