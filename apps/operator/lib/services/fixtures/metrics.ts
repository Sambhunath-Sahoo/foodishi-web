import type {
  OrderDetail,
  OrderFunnel,
  OrderStatus,
  OrdersOverTimePoint,
  PlatformSummary,
  RestaurantMetrics,
  StatusCount,
} from "../../api-types";
import type { MetricsService, Workload } from "../types";
import {
  divergenceTier,
  gapMinutes,
  gapScale,
} from "../../kitchen-gap";
import { totalCommissionPaise } from "./commission";
import { isRefundPastSla } from "./finance";
import { settle } from "./latency";
import { meanPaise, sumPaise, toPaise, toRupees } from "./money";
import { allOrderDetails, isLive } from "./orders";
import { toWholePage } from "./paging";
import {
  allApplications,
  allCoupons,
  allCustomers,
  allDeliveries,
  allRefunds,
  allRestaurants,
} from "./store";
import { SEED_PAYMENTS } from "./seed";

/**
 * Every figure on the overview, computed from the orders themselves.
 *
 * None of this is stored. A seeded "total revenue" that did not equal the sum of
 * the delivered orders behind it would be a console that lies about its own
 * data, and the first person to add up a table would find it. So each number
 * here is derived, and the definitions are stated because several of them could
 * reasonably mean two things:
 *
 *   gross revenue      what customers paid for delivered orders, all in
 *   commission revenue Foodishi's cut of the food value of those orders
 *   revenue today      delivered money from orders *placed* today, so it lines
 *                      up with the order count beside it rather than counting
 *                      last night's dinner because it was handed over at 00:05
 *   average order      delivered revenue over delivered orders — not total over
 *                      total, which would divide by orders that earned nothing
 *   active customers   placed an order inside the window below. Trading
 *                      activity, not the account switch.
 */

/** How far back "has ordered recently" reaches. */
const ACTIVE_CUSTOMER_WINDOW_DAYS = 30;

const MS_PER_DAY = 86_400_000;
const MS_PER_MINUTE = 60_000;

/** Local midnight, because "today" is the reader's day, not UTC's. */
function startOfToday(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

/** "2026-08-21" in the reader's own timezone, for the daily buckets. */
function dateKey(ms: number): string {
  const at = new Date(ms);
  const month = String(at.getMonth() + 1).padStart(2, "0");
  const day = String(at.getDate()).padStart(2, "0");
  return `${String(at.getFullYear())}-${month}-${day}`;
}

function isDelivered(order: OrderDetail): boolean {
  return order.status === "delivered";
}

function buildSummary(): PlatformSummary {
  const orders = allOrderDetails();
  const delivered = orders.filter(isDelivered);
  const midnight = startOfToday();
  const nowMs = Date.now();

  const placedToday = orders.filter(
    (order) => Date.parse(order.placed_at) >= midnight,
  );
  const grossPaise = sumPaise(delivered, (order) => order.total_amount);

  const activeSince = nowMs - ACTIVE_CUSTOMER_WINDOW_DAYS * MS_PER_DAY;
  const activeCustomers = new Set(
    orders
      .filter((order) => Date.parse(order.placed_at) >= activeSince)
      .map((order) => order.user_id),
  );

  return {
    total_orders: orders.length,
    orders_today: placedToday.length,
    revenue_today: toRupees(
      sumPaise(placedToday.filter(isDelivered), (order) => order.total_amount),
    ),
    gross_revenue: toRupees(grossPaise),
    commission_revenue: toRupees(totalCommissionPaise(delivered)),
    live_orders: orders.filter(isLive).length,
    delivered_orders: delivered.length,
    cancelled_orders: orders.filter((order) => order.status === "cancelled").length,
    avg_order_value: toRupees(meanPaise(grossPaise, delivered.length)),
    breached_refunds: allRefunds().filter((refund) => isRefundPastSla(refund, nowMs))
      .length,
    active_restaurants: allRestaurants().filter((row) => row.is_active).length,
    active_customers: activeCustomers.size,
    active_customer_window_days: ACTIVE_CUSTOMER_WINDOW_DAYS,
    total_users: allCustomers().length,
  };
}

/**
 * One point per day that had at least one order, oldest first.
 *
 * Days with no orders are left out rather than sent as zeroes, which is what
 * the endpoint does — and it is why the chart's caption states how many days it
 * actually drew rather than assuming the window.
 */
function buildOrdersOverTime(days: number): readonly OrdersOverTimePoint[] {
  const from = startOfToday() - Math.max(0, days - 1) * MS_PER_DAY;
  const buckets = new Map<string, { orders: number; revenuePaise: number }>();

  for (const order of allOrderDetails()) {
    const placedMs = Date.parse(order.placed_at);
    if (placedMs < from) continue;
    const key = dateKey(placedMs);
    const bucket = buckets.get(key) ?? { orders: 0, revenuePaise: 0 };
    buckets.set(key, {
      orders: bucket.orders + 1,
      revenuePaise:
        bucket.revenuePaise + (isDelivered(order) ? toPaise(order.total_amount) : 0),
    });
  }

  return [...buckets.entries()]
    .map(([date, bucket]) => ({
      date,
      order_count: bucket.orders,
      revenue: toRupees(bucket.revenuePaise),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

/**
 * Where the work is, in one pass.
 *
 * Every figure here is the same figure its own section shows, computed the same
 * way — the slipping count comes from `lib/kitchen-gap`, which is the one
 * definition the overview and the restaurant board also read, and the breached
 * count from the same rule the SLA watch uses. A sidebar that disagreed with the
 * page it links to would be worse than a sidebar with no numbers on it.
 */
function buildWorkload(): Workload {
  const nowMs = Date.now();
  const orders = allOrderDetails();

  const activeRides = allDeliveries().filter(
    (delivery) => delivery.status === "assigned" || delivery.status === "picked_up",
  );
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const ridesLate = activeRides.filter((delivery) => {
    const order = orderById.get(delivery.order_id);
    return order !== undefined && Date.parse(order.promised_at) < nowMs;
  }).length;

  const kitchens = buildRestaurantMetrics();
  const scale = gapScale(kitchens);

  const breached = allRefunds().filter((refund) => isRefundPastSla(refund, nowMs));

  const live = orders.filter(isLive);

  return {
    live_orders: live.length,
    // The order's promise, not the ride's: an order can be past what the
    // customer was told before a rider has even been assigned to it, and that
    // is the case somebody most needs to see.
    orders_late: live.filter((order) => Date.parse(order.promised_at) < nowMs)
      .length,
    deliveries_out: activeRides.length,
    deliveries_late: ridesLate,
    restaurants_slipping: kitchens.filter(
      (row) => divergenceTier(gapMinutes(row), scale) > 0,
    ).length,
    coupons_exhausted: allCoupons().filter(
      (coupon) =>
        coupon.is_active &&
        coupon.usage_limit_total !== null &&
        coupon.times_used >= coupon.usage_limit_total,
    ).length,
    // Scoped to the last day: a badge implies "now", and the all-time count of
    // failed attempts is a number nobody can act on.
    payments_failed: SEED_PAYMENTS.filter(
      (payment) =>
        payment.status === "failed" &&
        Date.parse(payment.created_at) >= nowMs - MS_PER_DAY,
    ).length,
    refunds_breached: breached.length,
    refunds_owed: toRupees(sumPaise(breached, (refund) => refund.amount)),
    applications_pending: allApplications().filter(
      (application) => application.status === "pending",
    ).length,
  };
}

const FUNNEL_ORDER: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

function buildFunnel(): OrderFunnel {
  const orders = allOrderDetails();
  const cancelled = orders.filter((order) => order.status === "cancelled");

  const statuses: StatusCount[] = FUNNEL_ORDER.map((status) => ({
    status,
    order_count: orders.filter((order) => order.status === status).length,
  }));

  // Inside the window means the customer paid no fee for cancelling. It is the
  // split that decides whether a cancellation cost anybody anything.
  const inside = cancelled.filter(
    (order) =>
      order.cancelled_at !== null &&
      Date.parse(order.cancelled_at) <= Date.parse(order.cancellable_until),
  ).length;

  return {
    statuses,
    total_orders: orders.length,
    cancelled_orders: cancelled.length,
    cancellation_rate: orders.length === 0 ? 0 : cancelled.length / orders.length,
    cancelled_inside_window: inside,
    cancelled_outside_window: cancelled.length - inside,
  };
}

/**
 * Per kitchen: what it took, what it earned, and the gap between the prep time
 * it declares and how long an order really takes end to end.
 *
 * `avg_delivery_minutes` is placed-to-delivered, not the ride: the promise a
 * customer is given is built on the declared prep time, so the number worth
 * comparing it against is the whole journey. That gap is what the overview and
 * the restaurant board grade kitchens on.
 */
function buildRestaurantMetrics(): readonly RestaurantMetrics[] {
  const orders = allOrderDetails();

  return allRestaurants()
    .map((restaurant) => {
      const own = orders.filter((order) => order.restaurant_id === restaurant.id);
      const delivered = own.filter(isDelivered);
      const cancelled = own.filter((order) => order.status === "cancelled").length;

      const totalMinutes = delivered.reduce((sum, order) => {
        const deliveredAt = order.delivered_at;
        if (deliveredAt === null) return sum;
        return sum + (Date.parse(deliveredAt) - Date.parse(order.placed_at)) / MS_PER_MINUTE;
      }, 0);

      return {
        restaurant_id: restaurant.id,
        name: restaurant.name,
        order_count: own.length,
        revenue: toRupees(sumPaise(delivered, (order) => order.total_amount)),
        cancellation_rate: own.length === 0 ? 0 : cancelled / own.length,
        avg_delivery_minutes:
          delivered.length === 0 ? null : Math.round(totalMinutes / delivered.length),
        avg_prep_minutes: restaurant.avg_prep_minutes,
      };
    })
    .filter((row) => row.order_count > 0);
}

export const fixtureMetrics: MetricsService = {
  getSummary: () => settle(buildSummary()),
  getWorkload: () => settle(buildWorkload()),
  listOrdersOverTime: (days) => settle(buildOrdersOverTime(days)),
  getFunnel: () => settle(buildFunnel()),
  listRestaurantMetrics: () => settle(toWholePage(buildRestaurantMetrics())),
};
