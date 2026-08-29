/**
 * What cancelling costs, worked out before the tap.
 *
 * This mirrors `app/services/policy.py::evaluate_cancellation` so the button
 * can state the consequence up front — "Cancel — free for 4 more min" or
 * "Cancel — ₹105 fee applies" — instead of a bare "Cancel" and a surprise.
 *
 * It is a *preview*. The server decides, and the number the customer is
 * finally told is the one CancelResult reports back. Every input here comes
 * from the API: `cancellable_until` and `total_amount` are frozen onto the
 * order, `cancellation_fee_percent` comes from the restaurant's policy, and
 * the captured amount comes from the order's payments.
 */
import { formatMinutes, formatMoneyShort, toNumber } from "./format";

const MS_PER_MINUTE = 60_000;
const PERCENT = 100;

export interface CancellationPreview {
  /** True while the free-cancellation window is still open. */
  readonly isFree: boolean;
  /** Whole minutes of free cancellation left; 0 once the window has closed. */
  readonly freeMinutesLeft: number;
  /** What the fee would be right now, capped at what has actually been paid. */
  readonly fee: number;
  /** What would come back: captured minus the fee, never below zero. */
  readonly refund: number;
  /** True when nothing has been captured, so there is nothing to refund. */
  readonly isUnpaid: boolean;
}

export interface CancellationInputs {
  readonly cancellableUntil: string;
  readonly totalAmount: string;
  readonly capturedAmount: number;
  readonly cancellationFeePercent: string | number | null | undefined;
  readonly now?: Date;
}

function roundToPaise(amount: number): number {
  return Math.round(amount * PERCENT) / PERCENT;
}

export function previewCancellation({
  cancellableUntil,
  totalAmount,
  capturedAmount,
  cancellationFeePercent,
  now = new Date(),
}: CancellationInputs): CancellationPreview {
  const deadline = new Date(cancellableUntil).getTime();
  const isFree = Number.isFinite(deadline) && now.getTime() <= deadline;
  const freeMinutesLeft = isFree
    ? Math.max(Math.ceil((deadline - now.getTime()) / MS_PER_MINUTE), 0)
    : 0;

  const captured = Math.max(roundToPaise(capturedAmount), 0);

  // The server caps the fee at what it actually holds, so a cash order is
  // never billed a cancellation fee it cannot collect.
  const uncappedFee = isFree
    ? 0
    : roundToPaise((toNumber(totalAmount) * toNumber(cancellationFeePercent)) / PERCENT);
  const fee = Math.min(uncappedFee, captured);
  const refund = Math.max(roundToPaise(captured - fee), 0);

  return { isFree, freeMinutesLeft, fee, refund, isUnpaid: captured === 0 };
}

/**
 * The button's own words. DESIGN.md copy rule #1: the consequence, with the
 * real number, before the tap.
 */
export function cancelButtonLabel(preview: CancellationPreview): string {
  if (preview.isFree) {
    return preview.freeMinutesLeft > 0
      ? `Cancel — free for ${formatMinutes(preview.freeMinutesLeft)} more`
      : "Cancel — free right now";
  }
  if (preview.fee === 0) {
    return "Cancel — no fee, nothing has been charged yet";
  }
  return `Cancel — ${formatMoneyShort(preview.fee)} fee applies`;
}

/** The same consequence spelled out in full, for the confirmation dialog. */
export function cancelConsequence(preview: CancellationPreview): string {
  if (preview.isFree) {
    return preview.refund > 0
      ? `You are inside the free window, so there is no cancellation fee. ${formatMoneyShort(preview.refund)} comes back to the account you paid from.`
      : "You are inside the free window, so there is no cancellation fee.";
  }
  if (preview.isUnpaid) {
    return "The free window has closed, but nothing has been captured for this order yet, so there is nothing to charge and nothing to refund.";
  }
  return `The free window has closed. ${formatMoneyShort(preview.fee)} is kept as the cancellation fee and ${formatMoneyShort(preview.refund)} is refunded to the account you paid from.`;
}
