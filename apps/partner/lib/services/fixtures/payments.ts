/**
 * Earnings, settlements and the money trail.
 *
 * Every rupee here is computed from the same delivered orders the reports
 * screen adds up, and the commission comes off the restaurant's own rate. The
 * settlement seed carries only metadata — a reference, a period, a status, the
 * last four digits of an account — for exactly that reason: a stored total
 * would be the one number on this console able to disagree with the orders it
 * claims to summarise.
 *
 * A restaurant reads this screen to answer one question: what is coming, and
 * what came off. So every deduction is named and shown, never netted away.
 */
import type {
  EarningsSummary,
  LedgerEntry,
  OrderDetail,
  Page,
  ReportWindow,
  Settlement,
} from "../../types";
import type { PaymentsService } from "../types";
import { settle } from "./latency";
import { requirePermission } from "./guard";
import { percentOf, subtract, sum } from "./money";
import {
  commissionPercentFor,
  dayOffsetToDate,
  ordersFor,
  settlementSeedsFor,
  toLocalDate,
} from "./store";

/** GST on the platform's commission, which the restaurant also carries. */
const TAX_ON_COMMISSION_PERCENT = "18.00";

function deliveredBetween(
  restaurantId: number,
  from: string,
  to: string,
): readonly OrderDetail[] {
  return ordersFor(restaurantId).filter((order) => {
    const day = toLocalDate(order.placed_at);
    return order.status === "delivered" && day >= from && day <= to;
  });
}

function cancelledBetween(
  restaurantId: number,
  from: string,
  to: string,
): readonly OrderDetail[] {
  return ordersFor(restaurantId).filter((order) => {
    const day = toLocalDate(order.placed_at);
    return order.status === "cancelled" && day >= from && day <= to;
  });
}

/**
 * What one period is worth: gross taken, commission and its tax off, refunds
 * off, and what is left.
 *
 * Gross is the order total, delivery fee and all. That is what the customer
 * paid through the platform, so it is what the statement starts from — netting
 * the delivery fee out first would leave a restaurant unable to reconcile this
 * screen against a single receipt.
 */
function settleUp(
  restaurantId: number,
  from: string,
  to: string,
): {
  readonly orders: number;
  readonly gross: string;
  readonly commission: string;
  readonly tax: string;
  readonly refunds: string;
  readonly net: string;
} {
  const delivered = deliveredBetween(restaurantId, from, to);
  const gross = sum(delivered.map((order) => order.total_amount));
  const rate = commissionPercentFor(restaurantId);
  const commission = percentOf(gross, rate);
  const tax = percentOf(commission, TAX_ON_COMMISSION_PERCENT);
  // A refunded order is money that came back out again, so it is a deduction
  // even though it was never in `gross` — the customer paid, the kitchen
  // refused, the platform returned it.
  const refunds = sum(
    cancelledBetween(restaurantId, from, to).map((order) => order.total_amount),
  );
  const net = subtract(subtract(gross, commission), tax);
  return { orders: delivered.length, gross, commission, tax, refunds, net };
}

function toSettlement(
  seed: ReturnType<typeof settlementSeedsFor>[number],
): Settlement {
  const from = dayOffsetToDate(seed.period_from_offset);
  const to = dayOffsetToDate(seed.period_to_offset);
  const totals = settleUp(seed.restaurant_id, from, to);
  return {
    id: seed.id,
    restaurant_id: seed.restaurant_id,
    reference: seed.reference,
    period_from: from,
    period_to: to,
    orders_count: totals.orders,
    gross: totals.gross,
    commission: totals.commission,
    tax_on_commission: totals.tax,
    refunds: totals.refunds,
    net: totals.net,
    status: seed.status,
    paid_at:
      seed.paid_at_offset === null
        ? null
        : `${dayOffsetToDate(seed.paid_at_offset)}T11:00:00.000Z`,
    account_last4: seed.account_last4,
  };
}

export const fixturePayments: PaymentsService = {
  earnings(restaurantId, window: ReportWindow) {
    requirePermission(restaurantId, "payments.view");
    const totals = settleUp(restaurantId, window.from, window.to);
    const settlements = settlementSeedsFor(restaurantId).map(toSettlement);

    // "Settled" is what has actually been paid out, not what was earned. The
    // gap between the two is the only figure on this screen a restaurant is
    // waiting on, so it is named rather than left to be subtracted by hand.
    const paid = settlements.filter((row) => row.status === "paid");
    const settled = sum(paid.map((row) => row.net));

    const summary: EarningsSummary = {
      gross: totals.gross,
      commission: totals.commission,
      commission_percent: commissionPercentFor(restaurantId),
      tax_on_commission: totals.tax,
      refunds: totals.refunds,
      net: totals.net,
      settled,
      pending: sum(
        settlements
          .filter((row) => row.status !== "paid")
          .map((row) => row.net),
      ),
    };
    return settle(summary);
  },

  settlements(restaurantId) {
    requirePermission(restaurantId, "payments.view");
    return settle(
      settlementSeedsFor(restaurantId)
        .map(toSettlement)
        // Newest period first: the one a restaurant is waiting on is the one
        // they opened this screen for.
        .sort((left, right) => right.period_from.localeCompare(left.period_from)),
    );
  },

  ledger(restaurantId, limit, offset) {
    requirePermission(restaurantId, "payments.view");
    const rate = commissionPercentFor(restaurantId);
    const rows: LedgerEntry[] = [];

    for (const order of ordersFor(restaurantId)) {
      if (order.status === "delivered") {
        rows.push({
          id: `order:${order.id}`,
          restaurant_id: restaurantId,
          kind: "order",
          occurred_at: order.delivered_at ?? order.placed_at,
          order_id: order.id,
          settlement_id: null,
          description: `Order #${order.id} delivered`,
          amount: order.total_amount,
        });
        const commission = percentOf(order.total_amount, rate);
        rows.push({
          id: `commission:${order.id}`,
          restaurant_id: restaurantId,
          kind: "commission",
          occurred_at: order.delivered_at ?? order.placed_at,
          order_id: order.id,
          settlement_id: null,
          description: `Platform commission at ${rate}%`,
          amount: `-${commission}`,
        });
      }
      if (order.status === "cancelled" && order.cancelled_at !== null) {
        rows.push({
          id: `refund:${order.id}`,
          restaurant_id: restaurantId,
          kind: "refund",
          occurred_at: order.cancelled_at,
          order_id: order.id,
          settlement_id: null,
          description: `Order #${order.id} refunded — ${order.cancellation_reason ?? "cancelled"}`,
          amount: `-${order.total_amount}`,
        });
      }
    }

    for (const row of settlementSeedsFor(restaurantId).map(toSettlement)) {
      if (row.paid_at === null) continue;
      rows.push({
        id: `payout:${row.id}`,
        restaurant_id: restaurantId,
        kind: "payout",
        occurred_at: row.paid_at,
        order_id: null,
        settlement_id: row.id,
        description: `Paid out to account ending ${row.account_last4} · ${row.reference}`,
        amount: `-${row.net}`,
      });
    }

    rows.sort(
      (left, right) =>
        new Date(right.occurred_at).getTime() - new Date(left.occurred_at).getTime(),
    );

    const page: Page<LedgerEntry> = {
      items: rows.slice(offset, offset + limit),
      total: rows.length,
      limit,
      offset,
    };
    return settle(page);
  },
};
