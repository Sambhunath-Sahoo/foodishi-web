/**
 * The two derived judgements this console makes: how late an order is, and
 * whether a refund is past its SLA. Both mirror the API's own rules so the
 * board never disagrees with the server about what is breached.
 *
 * Lateness is *graded*, not flat (DENSITY.md §3): the grade comes from the
 * shared `lateTier`, and the words from the shared `formatLate`, so "11h 37m"
 * can never render like "3m".
 */
import { formatLate, lateTier, type SeverityTier, type Tone } from "@repo/ui";
import { SEVERITY_TONE } from "@repo/ui";
import type { OrderRead, PaymentStatus, RefundRead, RefundStatus } from "./api-types";
import { hoursBetween, minutesBetween } from "./format";

/** Inside this many minutes of the promised time an order is worth watching. */
export const DUE_SOON_MINUTES = 10;

export interface Lateness {
  /** Positive when the order is past its promised time. */
  readonly lateMinutes: number;
  readonly isLate: boolean;
  readonly isDueSoon: boolean;
  /** 0 on time · 1 under an hour · 2 one to six hours · 3 beyond six. */
  readonly tier: SeverityTier;
  /** "6h 32m late", "due in 8 min", "on time" — never a bare colour. */
  readonly label: string;
  readonly tone: Tone;
}

export function getLateness(order: OrderRead, nowMs: number): Lateness {
  const lateMinutes = minutesBetween(new Date(order.promised_at).getTime(), nowMs);

  if (lateMinutes > 0) {
    const tier = lateTier(lateMinutes);
    return {
      lateMinutes,
      isLate: true,
      isDueSoon: false,
      tier,
      label: `${formatLate(lateMinutes)} late`,
      tone: SEVERITY_TONE[tier],
    };
  }

  const minutesRemaining = Math.abs(lateMinutes);
  const isDueSoon = minutesRemaining <= DUE_SOON_MINUTES;
  return {
    lateMinutes,
    isLate: false,
    isDueSoon,
    tier: 0,
    label: minutesRemaining === 0 ? "due now" : `due in ${minutesRemaining} min`,
    tone: isDueSoon ? "warn" : "mute",
  };
}

/**
 * Past this, a live order is not late — it is stuck.
 *
 * Six hours is where `lateTier` already tops out at its worst grade, so beyond
 * it the stripe and the sort stop carrying any signal: on the demo data every
 * one of 36 live rows read "44d 20h late" with an identical stripe, and the one
 * order that went late ten minutes ago would have been invisible among them
 * (OP-3). Nothing a rider or a kitchen does in the next ten minutes changes a
 * stuck order; somebody has to decide what happens to the money. So these rows
 * leave the live queue and are worked as their own short list.
 *
 * Measured against the wall clock, never against a seed date, so it holds for
 * both six-week-old demo data and a fresh order that stalls tonight. The
 * server-side expiry that would make this list empty is AD-2.
 */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/** A live order more than `STALE_AFTER_MS` past its promise. */
export function isStuck(order: Pick<OrderRead, "promised_at">, nowMs: number): boolean {
  return nowMs - new Date(order.promised_at).getTime() > STALE_AFTER_MS;
}

export interface LateTally {
  /** Past the promise but inside six hours — still worth chasing a rider for. */
  readonly late: number;
  /** Over six hours past it — a money decision, counted apart (OP-3). */
  readonly stuck: number;
}

/**
 * Late and stuck, split the one way every count in the console splits them.
 *
 * The server's `orders_late` and `deliveries_late` count every row past its
 * promise, stuck ones included, so on the demo data the rail said "13 late" and
 * the overview "36 past promised" in red while the live board — which takes
 * stuck rows off the queue — showed nothing late at all. Counting both halves
 * here, from the rows, is what lets every badge agree with the board.
 */
export function tallyLate(
  orders: readonly Pick<OrderRead, "promised_at">[],
  nowMs: number,
): LateTally {
  const stuck = orders.filter((order) => isStuck(order, nowMs)).length;
  const pastPromise = orders.filter(
    (order) => new Date(order.promised_at).getTime() < nowMs,
  ).length;
  return { late: pastPromise - stuck, stuck };
}

export interface PromiseOutcome {
  /** 0 on time or not applicable · 1..3 the lateness grade. */
  readonly tier: SeverityTier;
  /** "on time", "42 min late", "due in 8 min", "cancelled". Never a colour. */
  readonly label: string;
  readonly isLate: boolean;
}

/**
 * How an order did against the time the customer was promised.
 *
 * Three different questions wearing one column. A live order is late by the
 * wall clock and its lateness is still growing; a delivered order was late or
 * it was not, and that verdict is fixed forever; a cancelled order was never
 * going to arrive, so measuring it against a promise says nothing. Collapsing
 * the three into one "minutes late" number is how a board ends up claiming an
 * order cancelled last March is nine thousand minutes overdue.
 */
export function getPromiseOutcome(order: OrderRead, nowMs: number): PromiseOutcome {
  if (order.status === "cancelled") {
    return { tier: 0, label: "cancelled", isLate: false };
  }

  if (order.delivered_at !== null) {
    const lateMinutes = minutesBetween(
      new Date(order.promised_at).getTime(),
      new Date(order.delivered_at).getTime(),
    );
    if (lateMinutes <= 0) return { tier: 0, label: "on time", isLate: false };
    const tier = lateTier(lateMinutes);
    return { tier, label: `${formatLate(lateMinutes)} late`, isLate: true };
  }

  // Stuck rather than late (OP-3): the same quiet treatment the live board's
  // stuck list gives it — no stripe, because six weeks and seven hours are not
  // a ranking anybody can act on, and the word says what the stripe cannot.
  if (isStuck(order, nowMs)) {
    const lateMinutes = minutesBetween(new Date(order.promised_at).getTime(), nowMs);
    return { tier: 0, label: `stuck · ${formatLate(lateMinutes)}`, isLate: true };
  }

  const lateness = getLateness(order, nowMs);
  return { tier: lateness.tier, label: lateness.label, isLate: lateness.isLate };
}

/**
 * The API's own rule: past the due time and not yet completed. A failed refund
 * still counts — the money never went back.
 */
export function isRefundBreached(refund: RefundRead, nowMs: number): boolean {
  return nowMs > new Date(refund.sla_due_at).getTime() && refund.status !== "completed";
}

/**
 * The same three-tier grade the live board uses, on the scale a refund lives
 * on. An order is late in minutes; a refund is late in days, so the tier
 * boundaries move even though the tokens and the words do not.
 */
const REFUND_TIER_2_HOURS = 6;
const REFUND_TIER_3_HOURS = 24;

export function refundTier(overdueHours: number): SeverityTier {
  if (!Number.isFinite(overdueHours) || overdueHours <= 0) return 0;
  if (overdueHours < REFUND_TIER_2_HOURS) return 1;
  if (overdueHours < REFUND_TIER_3_HOURS) return 2;
  return 3;
}

/** How far past the SLA due time, in hours. Zero while still inside it. */
export function refundBreachHours(refund: RefundRead, nowMs: number): number {
  return Math.max(0, hoursBetween(new Date(refund.sla_due_at).getTime(), nowMs));
}

const REFUND_STATUS_TONE: Record<RefundStatus, Tone> = {
  initiated: "mute",
  processing: "warn",
  completed: "ok",
  failed: "crit",
};

export function refundStatusTone(status: RefundStatus): Tone {
  return REFUND_STATUS_TONE[status] ?? "mute";
}

/**
 * Each tone keeps the one meaning DESIGN.md gives it (OP-7): ok is money that
 * arrived, crit is money that did not, mute is waiting. Refunded used to be
 * `cool` — which means "out for delivery" everywhere else in the product — and
 * a partial refund was `warn`, which means the clock is running. Neither is
 * true of money that has already gone back, so both are mute: settled, and
 * nothing for anybody to do. The chip's word still says which one it is.
 */
const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = {
  pending: "mute",
  authorized: "accent",
  captured: "ok",
  failed: "crit",
  refunded: "mute",
  partially_refunded: "mute",
};

export function paymentStatusTone(status: PaymentStatus): Tone {
  return PAYMENT_STATUS_TONE[status] ?? "mute";
}
