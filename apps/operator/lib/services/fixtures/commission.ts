import type { OrderDetail } from "../../api-types";
import { percentOfPaise, toPaise } from "./money";
import { readSettings } from "./store";

/**
 * What Foodishi keeps out of a delivered order.
 *
 * Commission is charged on the food, not on the bill: delivery and packaging
 * are pass-through, and charging a percentage of the tax would be charging a
 * percentage of the government's money. `subtotal` is the only line it is taken
 * from, which is also why the ledger shows the food value beside the gross —
 * a commission whose base is invisible is a number nobody can check.
 *
 * The rate comes from platform settings and can be overridden per kitchen, so
 * this is the one place that decides which rate applies. Three screens read it
 * (the overview's revenue tile, the payments ledger and two reports) and they
 * must not be able to disagree.
 */
export function commissionPercentFor(restaurantId: number): number {
  const { commission } = readSettings();
  const override = commission.overrides.find(
    (row) => row.restaurant_id === restaurantId,
  );
  return override?.percent ?? commission.default_percent;
}

/** True when this kitchen is not on the platform default rate. */
export function isNegotiatedRate(restaurantId: number): boolean {
  return commissionPercentFor(restaurantId) !== readSettings().commission.default_percent;
}

/** Commission on one order, in paise. Zero unless it was delivered. */
export function commissionPaiseFor(order: OrderDetail): number {
  if (order.status !== "delivered") return 0;
  return percentOfPaise(toPaise(order.subtotal), commissionPercentFor(order.restaurant_id));
}

/** Commission across a set of orders, in paise. */
export function totalCommissionPaise(orders: readonly OrderDetail[]): number {
  return orders.reduce((total, order) => total + commissionPaiseFor(order), 0);
}
