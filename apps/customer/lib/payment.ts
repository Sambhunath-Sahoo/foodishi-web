/**
 * What a payment row actually means, in words a customer can act on.
 *
 * The provider is a mock that only ever AUTHORIZES: a row becomes `captured`
 * exclusively through POST /payments/{id}/callback, and that callback is a
 * gateway webhook behind a shared secret (app/routers/payments.py), which a
 * browser cannot hold and must never be handed. So nothing here writes "Paid"
 * over an authorized row — the amount is held, the capture has not happened,
 * and this app says exactly that until one arrives from outside.
 *
 * Pure functions, like lib/cancellation.ts: the caller owns the data and the
 * clock, so the wording can be read without mounting a screen.
 */
import type { Tone } from "@repo/ui";
import type { components } from "@repo/api-client";
import { formatMoney } from "./format";
import type { Page, Payment } from "./types";

/**
 * Straight off the generated schema, exactly as lib/types.ts does it. It lives
 * here rather than there because that file is being edited by another change
 * in flight; move it across when they meet.
 */
export type PaymentMethod = components["schemas"]["PaymentMethod"];

export interface PaymentMethodOption {
  readonly value: PaymentMethod;
  readonly label: string;
  /** What happens to the money when this one is the choice. */
  readonly hint: string;
}

/**
 * The five methods app/models/enums.py::PaymentMethod actually accepts. The
 * hint is the point: four of them hold the amount now, one collects nothing
 * until the door, and that difference decides what the customer owes tonight.
 */
export const PAYMENT_METHODS: readonly PaymentMethodOption[] = [
  {
    value: "upi",
    label: "UPI",
    hint: "The amount is held now and collected once the provider settles it.",
  },
  {
    value: "card",
    label: "Card",
    hint: "The amount is held on the card now and collected once the provider settles it.",
  },
  {
    value: "netbanking",
    label: "Net banking",
    hint: "The amount is held by your bank now and collected once the provider settles it.",
  },
  {
    value: "wallet",
    label: "Wallet",
    hint: "The amount is held in your wallet now and collected once the provider settles it.",
  },
  {
    value: "cod",
    label: "Cash on delivery",
    hint: "Nothing is charged now — you pay the rider at the door.",
  },
];

/** A default, not a nudge: it is the method most of these kitchens see. */
export const DEFAULT_PAYMENT_METHOD: PaymentMethod = "upi";

/** Never trust the wire: an unknown method reads as itself, not as a crash. */
export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHODS.find((option) => option.value === method)?.label ?? method;
}

export function isCashOnDelivery(method: string): boolean {
  return method === "cod";
}

export interface PaymentPresentation {
  readonly tone: Tone;
  /** The state in a few words. "Paid" only ever means captured. */
  readonly headline: string;
  /** One line under it: what that means, and what happens next. */
  readonly detail: string;
}

/**
 * One payment row, written up honestly.
 *
 * The two authorized branches are the whole reason this function exists. Money
 * held by a gateway and cash still in someone's pocket are both "authorized"
 * on the wire, and telling a customer either one is "paid" would be a lie the
 * screen has no way to take back.
 */
export function describePayment(payment: Payment): PaymentPresentation {
  const amount = formatMoney(payment.amount);

  switch (payment.status) {
    case "captured":
      return {
        tone: "ok",
        headline: `Paid ${amount}`,
        detail: "The provider confirmed the capture, so this amount has been collected.",
      };
    case "authorized":
      return isCashOnDelivery(payment.method)
        ? {
            tone: "cool",
            headline: `Pay ${amount} on delivery`,
            detail:
              "Nothing has been charged. The rider collects it at the door, and the order counts as paid then.",
          }
        : {
            tone: "warn",
            headline: `Authorized — ${amount} held`,
            detail:
              "Nothing has been collected yet. The provider confirms the capture on its own callback; this screen updates when it does.",
          };
    case "failed":
      // The provider's own sentence, verbatim — it names the thing to fix.
      return {
        tone: "crit",
        headline: "Payment failed",
        detail:
          payment.failed_reason ?? "The provider declined it without giving a reason.",
      };
    case "pending":
      return {
        tone: "mute",
        headline: "Payment not started",
        detail: "The provider has not answered this attempt yet.",
      };
    case "refunded":
      return {
        tone: "cool",
        headline: `Refunded ${amount}`,
        detail: "The whole amount went back to where it was paid from.",
      };
    case "partially_refunded":
      return {
        tone: "cool",
        headline: "Partly refunded",
        detail: `Some of ${amount} has gone back; the refund itself carries the exact figure.`,
      };
    default:
      return {
        tone: "mute",
        headline: "Payment recorded",
        detail: `The provider reports "${payment.status}", which this screen has not been taught to read yet.`,
      };
  }
}

/** Attempts nobody has settled: the ones worth re-reading from the API. */
const OPEN_STATUSES: readonly string[] = ["pending", "authorized"];
const MOVED_STATUSES: readonly string[] = [
  "captured",
  "refunded",
  "partially_refunded",
];

/**
 * Where an order stands on money, from its payment rows alone.
 *
 * Derived rather than stored: `orders` has no payment column and cannot be
 * given one, so the payments list is the only answer to "is this paid".
 *
 * · none    — no attempt has ever been made, so one can be.
 * · open    — an attempt is waiting on the provider. Nothing more to do here.
 * · paid    — money has actually moved at some point.
 * · failed  — every attempt was declined, so another one is worth offering.
 */
export type PaymentStanding = "none" | "open" | "paid" | "failed";

export function paymentStanding(page: Page<Payment> | undefined): PaymentStanding {
  const rows = page?.items ?? [];
  if (rows.length === 0) return "none";
  if (rows.some((row) => MOVED_STATUSES.includes(row.status))) return "paid";
  if (rows.some((row) => OPEN_STATUSES.includes(row.status))) return "open";
  return "failed";
}

/**
 * True while the provider still owes us an answer. The tracking screen polls
 * on this: a capture arrives out of band — from a gateway or an operator
 * holding the webhook secret — and would otherwise never show up on screen.
 */
export function hasOpenPayment(page: Page<Payment> | undefined): boolean {
  return (page?.items ?? []).some((row) => OPEN_STATUSES.includes(row.status));
}

/**
 * The state in one word, for a chip beside a figure that already shows the
 * amount. describePayment's headline repeats the amount ("Paid ₹929.05"),
 * which is right on the tracking screen and noise in a list that has the
 * amount in its own column.
 */
export function paymentStatusWord(payment: Payment): string {
  switch (payment.status) {
    case "captured":
      return "Paid";
    case "failed":
      return "Failed";
    case "authorized":
      return isCashOnDelivery(payment.method) ? "Due on delivery" : "Held";
    case "pending":
      return "Pending";
    case "refunded":
      return "Refunded";
    case "partially_refunded":
      return "Part refunded";
    default:
      return "Recorded";
  }
}

/**
 * The gateway's name, when it is one a customer would recognise. The sandbox
 * provider is called "mock" on the wire, and "UPI · mock" told a customer
 * their payment was not real.
 */
const INTERNAL_PROVIDERS: readonly string[] = ["mock", "test", "sandbox"];

export function customerProviderLabel(provider: string | null | undefined): string | null {
  if (provider === null || provider === undefined || provider.trim() === "") return null;
  return INTERNAL_PROVIDERS.includes(provider.trim().toLowerCase()) ? null : provider;
}
