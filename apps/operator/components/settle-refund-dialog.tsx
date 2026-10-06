"use client";

import * as React from "react";
import { Button, Dialog } from "@repo/ui";
import type { RefundDetail } from "../lib/api-types";
import { formatMoney, formatOrderRef } from "../lib/format";

export interface SettleRefundDialogProps {
  /** The refund being settled, or null when nothing is open. */
  readonly refund: RefundDetail | null;
  readonly isPending: boolean;
  readonly onConfirm: (refundId: number) => void;
  readonly onClose: () => void;
}

/**
 * The confirmation behind "Mark settled…".
 *
 * It used to be a bare "Settled" button that wrote on the first click (OP-8).
 * Settling records that the customer has their money back, and the provider is
 * never asked — so a slip closes a refund the customer is still waiting for,
 * and it drops off every overdue list that would have caught it. The amount and
 * the order are on the face of the dialog because "are you sure" without them
 * is a question nobody can answer honestly.
 */
export function SettleRefundDialog({
  refund,
  isPending,
  onConfirm,
  onClose,
}: SettleRefundDialogProps): React.JSX.Element {
  const amount = refund === null ? "" : formatMoney(refund.amount);
  const order = refund === null ? "" : formatOrderRef(refund.order_id);

  return (
    <Dialog
      open={refund !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={refund === null ? "" : `Mark refund #${String(refund.id)} settled?`}
      description={`This records ${amount} on ${order} as already back with the customer. Nothing is sent to the payment provider — do it only when the money moved another way.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Leave it open
          </Button>
          <Button
            variant="primary"
            isPending={isPending}
            pendingLabel="Recording…"
            onClick={() => {
              if (refund !== null) onConfirm(refund.id);
            }}
          >
            {`Mark ${amount} settled`}
          </Button>
        </>
      }
    />
  );
}
