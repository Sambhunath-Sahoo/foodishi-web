import type { OrderDetail, OrderStatus } from "../../api-types";
import type {
  CommissionCityRow,
  CommissionReport,
  CustomerReport,
  CustomerReportRow,
  OrderHourRow,
  OrderReport,
  OrderStatusRow,
  ReportRange,
  ReportsService,
  RestaurantReport,
  RestaurantReportRow,
  SalesDayRow,
  SalesReport,
} from "../types";
import {
  commissionPaiseFor,
  commissionPercentFor,
  isNegotiatedRate,
} from "./commission";
import { fixtureFinance } from "./finance";
import { settle } from "./latency";
import { meanPaise, percentOfPaise, sumPaise, toPaise, toRupees } from "./money";
import { allOrderDetails, windowStart, withinDays } from "./orders";
import { allCustomers, allRestaurants } from "./store";

/**
 * The five reports, all computed from the same set of orders.
 *
 * That is the whole design decision. A reports section built from five stored
 * tables can disagree with itself — the sales report saying one thing about last
 * week and the commission report another — and the first person to notice stops
 * trusting all five. So each report below is a different question asked of one
 * base: the orders placed inside the window.
 *
 * Each also answers a different *kind* of question, which is why they are not
 * one screen with a filter:
 *
 *   sales       how much came in, by day
 *   restaurants which kitchens earned it, and which are slipping
 *   orders      where orders ended up, and when they are placed
 *   customers   who is spending, and whether they came back
 *   commission  what the platform kept, and what it owes at settlement
 */

const MS_PER_MINUTE = 60_000;
const HOURS_PER_DAY = 24;
/** Rows in the two "top N" tables. Enough to act on, not a data dump. */
const TOP_ROWS = 25;

function isDelivered(order: OrderDetail): boolean {
  return order.status === "delivered";
}

/** "2026-08-21" in the reader's timezone — the same key the charts bucket on. */
function dateKey(ms: number): string {
  const at = new Date(ms);
  const month = String(at.getMonth() + 1).padStart(2, "0");
  const day = String(at.getDate()).padStart(2, "0");
  return `${String(at.getFullYear())}-${month}-${day}`;
}

function ordersIn(range: ReportRange): readonly OrderDetail[] {
  return withinDays(allOrderDetails(), range.days, Date.now());
}

/* ------------------------------------------------------------------ sales */

function buildSales(range: ReportRange): SalesReport {
  const orders = ordersIn(range);
  const byDay = new Map<string, OrderDetail[]>();

  for (const order of orders) {
    const key = dateKey(Date.parse(order.placed_at));
    const bucket = byDay.get(key) ?? [];
    bucket.push(order);
    byDay.set(key, bucket);
  }

  const days: SalesDayRow[] = [...byDay.entries()]
    .map(([date, rows]) => {
      const delivered = rows.filter(isDelivered);
      const gross = sumPaise(delivered, (order) => order.total_amount);
      return {
        // `day`, not `date`: the wire name. The console's hand-written mirror
        // called it `date` and nothing compared the two declarations.
        day: date,
        orders: rows.length,
        delivered: delivered.length,
        gross: toRupees(gross),
        commission: toRupees(
          delivered.reduce((total, order) => total + commissionPaiseFor(order), 0),
        ),
        avg_order_value: toRupees(meanPaise(gross, delivered.length)),
      };
    })
    .sort((left, right) => left.day.localeCompare(right.day));

  const delivered = orders.filter(isDelivered);
  const grossPaise = sumPaise(delivered, (order) => order.total_amount);

  return {
    days,
    orders: orders.length,
    delivered: delivered.length,
    cancelled: orders.filter((order) => order.status === "cancelled").length,
    gross: toRupees(grossPaise),
    commission: toRupees(
      delivered.reduce((total, order) => total + commissionPaiseFor(order), 0),
    ),
    avg_order_value: toRupees(meanPaise(grossPaise, delivered.length)),
    peak:
      days.reduce<SalesDayRow | null>(
        (best, day) => (best === null || day.orders > best.orders ? day : best),
        null,
      ) ?? null,
    // Present on the generated schema and absent from the console's old
    // hand-written pair, so this field never existed on the fixture at all.
    window_days: range.days,
  };
}

/* ------------------------------------------------------------ restaurants */

function buildRestaurants(range: ReportRange): RestaurantReport {
  const orders = ordersIn(range);

  const rows: RestaurantReportRow[] = allRestaurants()
    .map((restaurant) => {
      const own = orders.filter((order) => order.restaurant_id === restaurant.id);
      const delivered = own.filter(isDelivered);
      const cancelled = own.filter((order) => order.status === "cancelled");
      const gross = sumPaise(delivered, (order) => order.total_amount);
      const foodValue = sumPaise(delivered, (order) => order.subtotal);
      const percent = commissionPercentFor(restaurant.id);
      const commission = percentOfPaise(foodValue, percent);

      const minutes = delivered.reduce((total, order) => {
        const deliveredAt = order.delivered_at;
        return deliveredAt === null
          ? total
          : total + (Date.parse(deliveredAt) - Date.parse(order.placed_at)) / MS_PER_MINUTE;
      }, 0);

      return {
        restaurant_id: restaurant.id,
        name: restaurant.name,
        city: restaurant.city,
        delivered_orders: delivered.length,
        gross: toRupees(gross),
        food_value: toRupees(foodValue),
        // See fixtures/finance.ts: wire names and wire types. RestaurantReportRow
        // extends the now-aliased CommissionRow, so these are checked.
        commission_percent: percent.toFixed(2),
        is_negotiated: isNegotiatedRate(restaurant.id),
        commission: toRupees(commission),
        payout: toRupees(gross - commission),
        cancelled_orders: cancelled.length,
        cancellation_rate: own.length === 0 ? 0 : cancelled.length / own.length,
        avg_prep_minutes: restaurant.avg_prep_minutes,
        avg_delivery_minutes:
          delivered.length === 0 ? null : Math.round(minutes / delivered.length),
        is_active: restaurant.is_active,
      };
    })
    .sort((left, right) => toPaise(right.gross) - toPaise(left.gross));

  return {
    rows,
    gross: toRupees(sumPaise(rows, (row) => row.gross)),
    commission: toRupees(sumPaise(rows, (row) => row.commission)),
    days: range.days,
  };
}

/* ----------------------------------------------------------------- orders */

const STATUS_ORDER: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

function buildOrders(range: ReportRange): OrderReport {
  const orders = ordersIn(range);
  const delivered = orders.filter(isDelivered);
  const cancelled = orders.filter((order) => order.status === "cancelled");

  const statuses: OrderStatusRow[] = STATUS_ORDER.map((status) => {
    const rows = orders.filter((order) => order.status === status);
    return {
      status,
      orders: rows.length,
      share: orders.length === 0 ? 0 : rows.length / orders.length,
      gross: toRupees(sumPaise(rows, (order) => order.total_amount)),
    };
  });

  // Every hour of the day, including the quiet ones: a chart that skipped 04:00
  // because nothing happened would hide the shape of a night shift.
  const hours: OrderHourRow[] = Array.from({ length: HOURS_PER_DAY }, (_, hour) => ({
    hour,
    orders: orders.filter((order) => new Date(order.placed_at).getHours() === hour)
      .length,
  }));

  const inside = cancelled.filter(
    (order) =>
      order.cancelled_at !== null &&
      Date.parse(order.cancelled_at) <= Date.parse(order.cancellable_until),
  ).length;

  const minutes = delivered.reduce((total, order) => {
    const deliveredAt = order.delivered_at;
    return deliveredAt === null
      ? total
      : total + (Date.parse(deliveredAt) - Date.parse(order.placed_at)) / MS_PER_MINUTE;
  }, 0);

  return {
    statuses,
    hours,
    orders: orders.length,
    cancelled_inside_window: inside,
    cancelled_outside_window: cancelled.length - inside,
    delivered_late: delivered.filter(
      (order) =>
        order.delivered_at !== null &&
        Date.parse(order.delivered_at) > Date.parse(order.promised_at),
    ).length,
    avg_minutes_to_deliver:
      delivered.length === 0 ? null : Math.round(minutes / delivered.length),
    days: range.days,
  };
}

/* -------------------------------------------------------------- customers */

function buildCustomers(range: ReportRange): CustomerReport {
  const windowOrders = ordersIn(range);
  const allOrders = allOrderDetails();
  const windowFrom = windowStart(range.days, Date.now());

  const byCustomer = new Map<number, OrderDetail[]>();
  for (const order of windowOrders) {
    const bucket = byCustomer.get(order.user_id) ?? [];
    bucket.push(order);
    byCustomer.set(order.user_id, bucket);
  }

  /** Customers who had already ordered before the window opened. */
  const orderedBefore = new Set(
    allOrders
      .filter((order) => Date.parse(order.placed_at) < windowFrom)
      .map((order) => order.user_id),
  );
  const everOrdered = new Set(allOrders.map((order) => order.user_id));

  const rows: CustomerReportRow[] = allCustomers()
    .filter((customer) => byCustomer.has(customer.id))
    .map((customer) => {
      const own = byCustomer.get(customer.id) ?? [];
      const delivered = own.filter(isDelivered);
      const spend = sumPaise(delivered, (order) => order.total_amount);
      const lastOrdered = own.reduce<string | null>(
        (latest, order) =>
          latest === null || Date.parse(order.placed_at) > Date.parse(latest)
            ? order.placed_at
            : latest,
        null,
      );

      return {
        user_id: customer.id,
        name: customer.name,
        email: customer.email,
        city: customer.city,
        avatar_url: customer.avatar_url ?? null,
        is_active: customer.is_active,
        orders: own.length,
        delivered: delivered.length,
        cancelled: own.filter((order) => order.status === "cancelled").length,
        spend: toRupees(spend),
        avg_order_value: toRupees(meanPaise(spend, delivered.length)),
        last_ordered_at: lastOrdered,
      };
    })
    .sort((left, right) => toPaise(right.spend) - toPaise(left.spend))
    .slice(0, TOP_ROWS);

  const ordering = [...byCustomer.keys()];

  return {
    rows,
    customers: ordering.length,
    new_customers: ordering.filter((userId) => !orderedBefore.has(userId)).length,
    returning_customers: ordering.filter((userId) => orderedBefore.has(userId)).length,
    never_ordered: allCustomers().filter((customer) => !everOrdered.has(customer.id))
      .length,
    spend: toRupees(
      sumPaise(
        windowOrders.filter(isDelivered),
        (order) => order.total_amount,
      ),
    ),
    days: range.days,
  };
}

/* ------------------------------------------------------------- commission */

async function buildCommission(range: ReportRange): Promise<CommissionReport> {
  // The ledger is the finance service's, not a second implementation of it:
  // "what the platform kept" has to be one number wherever it is read.
  const ledger = await fixtureFinance.getLedger(range.days);
  const cityOf = new Map(allRestaurants().map((row) => [row.id, row.city]));

  const byCity = new Map<string, CommissionCityRow>();
  for (const row of ledger.rows) {
    const city = cityOf.get(row.restaurant_id) ?? "Unknown";
    const current = byCity.get(city);
    byCity.set(city, {
      city,
      restaurants: (current?.restaurants ?? 0) + 1,
      delivered_orders: (current?.delivered_orders ?? 0) + row.delivered_orders,
      gross: toRupees(toPaise(current?.gross ?? "0") + toPaise(row.gross)),
      commission: toRupees(toPaise(current?.commission ?? "0") + toPaise(row.commission)),
    });
  }

  return {
    ledger,
    cities: [...byCity.values()].sort(
      (left, right) => toPaise(right.commission) - toPaise(left.commission),
    ),
  };
}

export const fixtureReports: ReportsService = {
  sales: (range) => settle(buildSales(range)),
  restaurants: (range) => settle(buildRestaurants(range)),
  orders: (range) => settle(buildOrders(range)),
  customers: (range) => settle(buildCustomers(range)),
  commission: (range) => buildCommission(range),
};
