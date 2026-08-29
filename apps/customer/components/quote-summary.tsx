"use client";

import * as React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@repo/ui";
import { PriceBreakdown, PriceBreakdownSkeleton } from "./price-breakdown";
import { QueryError } from "./data-states";
import { formatTimeOnly } from "../lib/format";
import type { Quote } from "../lib/types";

/**
 * The live breakdown, with its three honest states. Shared by the cart and
 * the checkout so the number cannot differ between the two screens.
 */
export function QuoteSummary({
  quote,
  isPending,
  isFetching,
  error,
  onRetry,
  waitingFor,
}: {
  readonly quote: Quote | undefined;
  readonly isPending: boolean;
  readonly isFetching: boolean;
  readonly error: unknown;
  readonly onRetry: () => void;
  /** What is still missing before a price can be asked for at all. */
  readonly waitingFor?: string;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bill</CardTitle>
        {quote !== undefined && waitingFor === undefined ? (
          <span className="font-mono text-[11px] tabular-nums text-ink-3">
            arrives ~{formatTimeOnly(quote.promised_at)}
          </span>
        ) : null}
      </CardHeader>
      <CardBody>
        {waitingFor !== undefined ? (
          <p className="text-[13px] text-ink-3">{waitingFor}</p>
        ) : error !== null && error !== undefined ? (
          // The quote refuses for reasons the customer can fix — under the
          // minimum, out of range, kitchen closed — so print the server's
          // own sentence rather than a spinner that never resolves.
          <QueryError
            title="This order cannot be priced yet"
            error={error}
            onRetry={onRetry}
          />
        ) : isPending || quote === undefined ? (
          <PriceBreakdownSkeleton />
        ) : (
          <PriceBreakdown quote={quote} isRefreshing={isFetching} />
        )}
      </CardBody>
    </Card>
  );
}
