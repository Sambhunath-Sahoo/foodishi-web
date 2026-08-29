/**
 * Reports, added up from the same orders every other screen shows.
 *
 * Derived, never stored. A separate reports fixture would be the one thing on
 * this console able to disagree with itself — the dashboard saying eleven
 * orders while the sales report said nine — and that is exactly the bug a
 * stand-in should not be able to have. It costs a pass over the day's orders,
 * which is nothing, and it means the numbers on the payouts screen and the
 * numbers here come from one source.
 *
 * Revenue counts DELIVERED orders only, everywhere, without exception.
 * Cancelled trade is not revenue and in-flight trade is not revenue yet.
 */
import type {
  OrderDetail,
  PerformanceReport,
  PopularItem,
  ReportWindow,
  SalesDay,
} from "../../types";
import type { ReportsService } from "../types";
import { settle } from "./latency";
import { requirePermission } from "./guard";
import { divide, sum } from "./money";
import { eventsFor, findRestaurant, menuFor, ordersFor, toLocalDate } from "./store";

const MS_PER_MINUTE = 60_000;

/** Every day in the window, inclusive, oldest first — gaps included. */
function daysIn(window: ReportWindow): readonly string[] {
  const days: string[] = [];
  const cursor = new Date(`${window.from}T00:00:00`);
  const last = new Date(`${window.to}T00:00:00`);
  while (cursor.getTime() <= last.getTime()) {
    days.push(toLocalDate(cursor.getTime()));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function inWindow(order: OrderDetail, window: ReportWindow): boolean {
  const day = toLocalDate(order.placed_at);
  return day >= window.from && day <= window.to;
}

function ordersInWindow(
  restaurantId: number,
  window: ReportWindow,
): readonly OrderDetail[] {
  return ordersFor(restaurantId).filter((order) => inWindow(order, window));
}

/**
 * True when this order was rejected rather than cancelled.
 *
 * Both end as `cancelled` — there is one terminal status, not two — so the
 * difference lives in the trail: a rejection never reached `confirmed`. Worth
 * telling apart, because one is a kitchen that was too busy to start and the
 * other is a kitchen that broke a promise it had already made.
 */
function wasRejected(order: OrderDetail): boolean {
  if (order.status !== "cancelled") return false;
  return !eventsFor(order.id).some((event) => event.to_status === "confirmed");
}

export const fixtureReports: ReportsService = {
  sales(restaurantId, window) {
    requirePermission(restaurantId, "reports.view");
    const orders = ordersInWindow(restaurantId, window);
    const byDay = new Map<string, OrderDetail[]>();
    for (const order of orders) {
      const day = toLocalDate(order.placed_at);
      byDay.set(day, [...(byDay.get(day) ?? []), order]);
    }

    const rows: readonly SalesDay[] = daysIn(window).map((date) => {
      const dayOrders = byDay.get(date) ?? [];
      const delivered = dayOrders.filter((order) => order.status === "delivered");
      return {
        date,
        orders: dayOrders.length,
        delivered: delivered.length,
        cancelled: dayOrders.filter((order) => order.status === "cancelled").length,
        revenue: sum(delivered.map((order) => order.total_amount)),
        discount: sum(delivered.map((order) => order.discount_amount)),
      };
    });
    return settle(rows);
  },

  popularItems(restaurantId, window) {
    requirePermission(restaurantId, "reports.view");
    // Delivered only: a dish on three cancelled orders did not sell.
    const delivered = ordersInWindow(restaurantId, window).filter(
      (order) => order.status === "delivered",
    );

    const categoryOf = new Map<number, string>();
    const availableOf = new Map<number, boolean>();
    for (const category of menuFor(restaurantId)) {
      for (const item of category.items) {
        categoryOf.set(item.id, category.name);
        availableOf.set(item.id, item.is_available);
      }
    }

    interface Tally {
      name: string;
      quantity: number;
      orders: number;
      revenue: string;
    }
    const tally = new Map<number, Tally>();
    for (const order of delivered) {
      for (const line of order.items) {
        const current = tally.get(line.menu_item_id) ?? {
          name: line.item_name,
          quantity: 0,
          orders: 0,
          revenue: "0.00",
        };
        tally.set(line.menu_item_id, {
          name: line.item_name,
          quantity: current.quantity + line.quantity,
          orders: current.orders + 1,
          revenue: sum([current.revenue, line.line_total]),
        });
      }
    }

    const rows: readonly PopularItem[] = [...tally.entries()]
      .map(([menuItemId, row]) => ({
        menu_item_id: menuItemId,
        name: row.name,
        // A dish deleted since it was sold has no category any more, and saying
        // so is better than filing it under a category it never belonged to.
        category_name: categoryOf.get(menuItemId) ?? "No longer on the menu",
        quantity: row.quantity,
        orders: row.orders,
        revenue: row.revenue,
        is_available: availableOf.get(menuItemId) ?? false,
      }))
      .sort((left, right) => right.quantity - left.quantity);

    return settle(rows);
  },

  performance(restaurantId, window) {
    requirePermission(restaurantId, "reports.view");
    const restaurant = findRestaurant(restaurantId);
    const orders = ordersInWindow(restaurantId, window);
    const delivered = orders.filter(
      (order) => order.status === "delivered" && order.delivered_at !== null,
    );
    const cancelled = orders.filter((order) => order.status === "cancelled");
    const rejected = cancelled.filter(wasRejected);

    const onTime = delivered.filter(
      (order) =>
        new Date(order.delivered_at as string).getTime() <=
        new Date(order.promised_at).getTime(),
    );

    /** Placed to delivered, in whole minutes. */
    const deliveryMinutes = delivered.map(
      (order) =>
        (new Date(order.delivered_at as string).getTime() -
          new Date(order.placed_at).getTime()) /
        MS_PER_MINUTE,
    );

    /**
     * Placed to ready, in whole minutes — the kitchen's own share of the wait,
     * read off the trail rather than assumed from the restaurant's setting.
     * Orders with no ready event are left out instead of counted as zero.
     */
    const prepMinutes = delivered
      .map((order) => {
        const ready = eventsFor(order.id).find(
          (event) => event.to_status === "ready_for_pickup",
        );
        return ready === undefined
          ? null
          : (new Date(ready.created_at).getTime() -
              new Date(order.placed_at).getTime()) /
              MS_PER_MINUTE;
      })
      .filter((minutes): minutes is number => minutes !== null);

    function mean(values: readonly number[]): number {
      return values.length === 0
        ? 0
        : Math.round(values.reduce((total, one) => total + one, 0) / values.length);
    }

    const revenue = sum(delivered.map((order) => order.total_amount));
    const report: PerformanceReport = {
      orders: orders.length,
      delivered: delivered.length,
      cancelled: cancelled.length,
      rejected: rejected.length,
      on_time_rate:
        delivered.length === 0 ? 0 : onTime.length / delivered.length,
      avg_prep_minutes: mean(prepMinutes),
      avg_delivery_minutes: mean(deliveryMinutes),
      avg_order_value: divide(revenue, delivered.length),
      rating: restaurant?.rating ?? "0.0",
      rating_count: restaurant?.rating_count ?? 0,
    };
    return settle(report);
  },
};
