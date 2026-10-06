"use client";

import * as React from "react";
import { Button, Card, Dialog, ErrorBanner } from "@repo/ui";
import { toUserMessage } from "@repo/api-client";
import { useCancelOrder } from "../lib/queries/orders";
import {
  cancelButtonLabel,
  cancelConsequence,
  previewCancellation,
} from "../lib/cancellation";
import { formatDateTime, formatMoney } from "../lib/format";
import type { CancelResult } from "../lib/types";
import { APP_DIALOG } from "../lib/app-column";

/**
 * Cancelling, with the consequence stated before the tap.
 *
 * The label carries the real number — "Cancel — free for 4 more min" or
 * "Cancel — ₹105 fee applies" — worked out from the order's own
 * `cancellable_until`, the restaurant's `cancellation_fee_percent` and what
 * has actually been captured. That is a preview: once the server answers, the
 * fee and refund shown are the ones CancelResult reported, not the estimate.
 */
export function CancelOrderControl({
  orderId,
  userId,
  isCancellable,
  cancellableUntil,
  totalAmount,
  capturedAmount,
  cancellationFeePercent,
  now,
  onCancelled,
}: {
  readonly orderId: number;
  readonly userId: number | null;
  readonly isCancellable: boolean;
  readonly cancellableUntil: string;
  readonly totalAmount: string;
  readonly capturedAmount: number;
  readonly cancellationFeePercent: string | number | null | undefined;
  readonly now: Date;
  readonly onCancelled: () => void;
}): React.JSX.Element {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [result, setResult] = React.useState<CancelResult | null>(null);
  const cancel = useCancelOrder();

  const preview = previewCancellation({
    cancellableUntil,
    totalAmount,
    capturedAmount,
    cancellationFeePercent,
    now,
  });

  if (result !== null) {
    return (
      <Card stripe="crit" className="px-4 py-3">
        <p className="text-sm font-semibold text-ink">Order cancelled</p>
        <dl className="mt-2 flex flex-col gap-1 text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-2">Cancellation fee</dt>
            <dd className="tabular-nums text-ink">
              {formatMoney(result.cancellation_fee)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-2">Refund</dt>
            <dd className="tabular-nums text-ink">
              {formatMoney(result.refund_amount)}
            </dd>
          </div>
          {result.refund_due_at !== null ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">Due by</dt>
              <dd className="font-mono text-[12px] tabular-nums text-ink-2">
                {formatDateTime(result.refund_due_at)}
              </dd>
            </div>
          ) : null}
          {result.refund_id !== null ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">Refund reference</dt>
              <dd className="font-mono text-[12px] text-ink-2">#{result.refund_id}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-2 text-[13px] text-ink-3">
          {result.within_window
            ? "You cancelled inside the free window, so nothing was kept."
            : "The free window had closed, so the fee above was kept."}
        </p>
      </Card>
    );
  }

  if (!isCancellable) {
    return (
      <p className="text-[13px] text-ink-3">
        This order can no longer be cancelled here — the kitchen is past the point
        of stopping it. Support can still raise a refund against it.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="danger"
        block
        size="lg"
        // The label carries the consequence and can run long ("Cancel — no
        // fee, nothing has been charged yet"); it wraps rather than spilling
        // out of a 358px button.
        className="h-auto min-h-12 py-2 leading-snug whitespace-normal sm:w-full"
        onClick={() => setIsConfirming(true)}
        isPending={cancel.isPending}
        pendingLabel="Cancelling…"
      >
        {cancelButtonLabel(preview)}
      </Button>

      {cancel.isError ? (
        // 409 when the kitchen moved it first. The server says which.
        <ErrorBanner
          title="Not cancelled"
          message={toUserMessage(cancel.error)}
        />
      ) : null}

      <Dialog

        className={APP_DIALOG}
        open={isConfirming}
        onOpenChange={setIsConfirming}
        title="Cancel this order?"
        description={cancelConsequence(preview)}
        footer={
          <>
            <Button variant="outline" className="h-11" onClick={() => setIsConfirming(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              className="h-11"
              isPending={cancel.isPending}
              pendingLabel="Cancelling…"
              onClick={() =>
                cancel.mutate(
                  { orderId, userId, reason: "Cancelled by the customer" },
                  {
                    onSuccess: (answer) => {
                      setResult(answer);
                      setIsConfirming(false);
                      onCancelled();
                    },
                  },
                )
              }
            >
              {cancelButtonLabel(preview)}
            </Button>
          </>
        }
      />
    </div>
  );
}
