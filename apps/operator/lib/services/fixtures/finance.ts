import type {
  OrderDetail,
  PaymentRead,
  PaymentStatus,
  RefundDetail,
  RefundRead,
  RefundStatus,
} from "../../api-types";
import type {
  CommissionLedger,
  CommissionRow,
  FinanceService,
  RefundQuery,
  RefundTally,
  TransactionQuery,
} from "../types";
import { commissionPercentFor, isNegotiatedRate } from "./commission";
import { NotFoundError, settle, settleWrite, UnprocessableError } from "./latency";
import { percentOfPaise, sumPaise, toPaise, toRupees } from "./money";
import { matches, toPage, toWholePage } from "./paging";
import { allOrderDetails, withinDays } from "./orders";
import { SEED_PAYMENTS } from "./seed";
import { allRefunds, allRestaurants, findRefund, patchRefund, readSettings } from "./store";

/**
 * Money in, money back, and what the platform keeps.
 *
 * Three things a finance screen has to be able to state without hedging, so all
 * three are computed in one place from one set of orders. A transactions list
 * that disagreed with the commission ledger about what was delivered last week
 * would make both of them useless.
 *
 * `sla_breached` is decided here rather than by the page, exactly as the API
 * decides it: past the due time and still not completed. A failed refund counts
 * — the money never went back.
 */

/** Newest transaction first: a finance screen is read from the top. */
function byNewest(left: PaymentRead, right: PaymentRead): number {
  return Date.parse(right.created_at) - Date.parse(left.created_at);
}

function selectTransactions(query: TransactionQuery): readonly PaymentRead[] {
  const term = query.q.trim();

  return SEED_PAYMENTS.filter((payment) => {
    if (query.statuses !== null && !query.statuses.includes(payment.status)) {
      return false;
    }
    if (query.method !== null && payment.method !== query.method) return false;
    if (term === "") return true;
    return matches(`${String(payment.order_id)} ${payment.provider_ref ?? ""}`, term);
  })
    .slice()
    .sort(byNewest);
}

/* ---------------------------------------------------------------- refunds */

function isBreached(refund: RefundRead, nowMs: number): boolean {
  return refund.status !== "completed" && nowMs > Date.parse(refund.sla_due_at);
}

/** The read that carries the platform's own verdict, so no page re-derives it. */
function toDetail(refund: RefundRead, nowMs: number): RefundDetail {
  return { ...refund, sla_breached: isBreached(refund, nowMs) };
}

/** Worst first: the refund that has been past its promise the longest. */
function byOverdue(left: RefundDetail, right: RefundDetail): number {
  if (left.sla_breached !== right.sla_breached) return left.sla_breached ? -1 : 1;
  return Date.parse(left.sla_due_at) - Date.parse(right.sla_due_at);
}

function selectRefunds(query: RefundQuery): readonly RefundDetail[] {
  const nowMs = Date.now();
  const term = query.q.trim();

  return allRefunds()
    .map((refund) => toDetail(refund, nowMs))
    .filter((refund) => {
      if (query.breachedOnly && !refund.sla_breached) return false;
      if (query.status !== null && refund.status !== query.status) return false;
      if (term === "") return true;
      return matches(
        `${String(refund.id)} ${String(refund.order_id)} ${refund.provider_ref ?? ""}`,
        term,
      );
    })
    .sort(byOverdue);
}

function requireRefund(refundId: number): RefundRead {
  const refund = findRefund(refundId);
  if (refund === null) {
    throw new NotFoundError(`No refund with id ${String(refundId)}.`);
  }
  return refund;
}

/* ---------------------------------------------------------------- ledger */

function buildLedger(days: number): CommissionLedger {
  const settings = readSettings();
  const delivered = withinDays(allOrderDetails(), days, Date.now()).filter(
    (order) => order.status === "delivered",
  );

  const byRestaurant = new Map<number, OrderDetail[]>();
  for (const order of delivered) {
    const existing = byRestaurant.get(order.restaurant_id) ?? [];
    existing.push(order);
    byRestaurant.set(order.restaurant_id, existing);
  }

  const rows: CommissionRow[] = allRestaurants()
    .map((restaurant) => {
      const orders = byRestaurant.get(restaurant.id) ?? [];
      const gross = sumPaise(orders, (order) => order.total_amount);
      const foodValue = sumPaise(orders, (order) => order.subtotal);
      const percent = commissionPercentFor(restaurant.id);
      const commission = percentOfPaise(foodValue, percent);

      return {
        restaurant_id: restaurant.id,
        name: restaurant.name,
        city: restaurant.city,
        delivered_orders: orders.length,
        gross: toRupees(gross),
        food_value: toRupees(foodValue),
        // Field names and types match the wire, not the console's old
        // hand-written interface: the API sends `is_negotiated` and serialises
        // Decimal as a string. The fixture was the source of the drift, so it is
        // where the correction belongs.
        commission_percent: percent.toFixed(2),
        is_negotiated: isNegotiatedRate(restaurant.id),
        commission: toRupees(commission),
        payout: toRupees(gross - commission),
      };
    })
    // Biggest earner first. A kitchen with nothing delivered in the window is
    // still listed, because "why is this one at zero" is a real question.
    .sort((left, right) => toPaise(right.commission) - toPaise(left.commission));

  return {
    rows,
    gross: toRupees(sumPaise(rows, (row) => row.gross)),
    food_value: toRupees(sumPaise(rows, (row) => row.food_value)),
    commission: toRupees(sumPaise(rows, (row) => row.commission)),
    payout: toRupees(sumPaise(rows, (row) => row.payout)),
    default_percent: settings.commission.default_percent.toFixed(2),
    settlement_days: settings.commission.settlement_days,
    days,
  };
}

export const fixtureFinance: FinanceService = {
  listTransactions: (query) => settle(toPage(selectTransactions(query), query)),

  countPaymentsByStatus: () => {
    const tally: Record<PaymentStatus, number> = {
      pending: 0,
      authorized: 0,
      captured: 0,
      failed: 0,
      refunded: 0,
      partially_refunded: 0,
    };
    for (const payment of SEED_PAYMENTS) tally[payment.status] += 1;
    return settle(tally);
  },

  countRefunds: () => {
    const nowMs = Date.now();
    const byStatus: Record<RefundStatus, number> = {
      initiated: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
    let breached = 0;
    let owedPaise = 0;

    for (const refund of allRefunds()) {
      byStatus[refund.status] += 1;
      if (isBreached(refund, nowMs)) {
        breached += 1;
        owedPaise += toPaise(refund.amount);
      }
    }
    return settle({ byStatus, breached, owed: toRupees(owedPaise) } as RefundTally);
  },

  listPaymentsForOrder: (orderId) =>
    settle(
      toWholePage(
        SEED_PAYMENTS.filter((payment) => payment.order_id === orderId)
          .slice()
          .sort(byNewest),
      ),
    ),

  listRefunds: (query) => settle(toPage(selectRefunds(query), query)),

  listRefundsForOrder: (orderId) =>
    settle(toWholePage(allRefunds().filter((refund) => refund.order_id === orderId))),

  retryRefund: async (refundId) => {
    const refund = requireRefund(refundId);
    if (refund.status === "completed") {
      throw new UnprocessableError(
        "This refund already landed. There is nothing to retry.",
      );
    }
    // A retry hands it back to the provider; it does not settle it. Saying
    // otherwise on screen would be claiming the customer has their money.
    patchRefund(refundId, {
      status: "processing",
      provider_ref: refund.provider_ref ?? `rfnd_retry_${String(refundId)}`,
    });
    return settleWrite(toDetail(requireRefund(refundId), Date.now()));
  },

  completeRefund: async (refundId) => {
    const refund = requireRefund(refundId);
    if (refund.status === "completed") {
      throw new UnprocessableError("This refund is already settled.");
    }
    patchRefund(refundId, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    return settleWrite(toDetail(requireRefund(refundId), Date.now()));
  },

  getLedger: (days) => settle(buildLedger(days)),
};

/** Shared with the metrics service, which counts the same breaches. */
export { isBreached as isRefundPastSla };
