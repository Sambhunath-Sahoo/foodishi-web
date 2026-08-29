import type {
  DeliveryDetail,
  OrderDetail,
  OrderRead,
  OrderStatus,
} from "../../api-types";
import type { OrderQuery, OrderSort, OrdersService } from "../types";
import { NotFoundError, settle } from "./latency";
import { matches, toPage } from "./paging";
import { toPaise } from "./money";
import { SEED_ORDERS } from "./seed";
import {
  allCustomers,
  allDeliveries,
  allRestaurants,
  eventsFor,
  findDeliveryForOrder,
} from "./store";

/**
 * Every order on the platform, searchable four ways.
 *
 * The orders board is the one screen an operator arrives at with a specific
 * order in mind — a customer is on the phone and they have an id, a name or a
 * restaurant. So the search runs over all three: the order's own id, the
 * customer's name and email, and the kitchen's name. Matching on the id alone
 * would mean every support call started with "can you read me the number".
 *
 * `MS_PER_DAY` and the date bound exist because "in the last 7 days" is a
 * question about the platform's present, and an unbounded list of 420 orders
 * answers a different one.
 */
const MS_PER_DAY = 86_400_000;

const TERMINAL_STATUSES: readonly OrderStatus[] = ["delivered", "cancelled"];

/** Live means somewhere between placed and handed over. */
export function isLive(order: Pick<OrderDetail, "status">): boolean {
  return !TERMINAL_STATUSES.includes(order.status);
}

/**
 * The list row, which is the detail without its items.
 *
 * Projected rather than stored twice: `OrderRead` and `OrderDetail` differ by
 * exactly one field, and two seed files that had to agree on the other nineteen
 * is a drift waiting to happen. Written out field by field rather than spread
 * and stripped, so a field added to the schema shows up here as a build error
 * instead of silently riding along on a list response.
 */
export function toOrderRead(order: OrderDetail): OrderRead {
  return {
    id: order.id,
    user_id: order.user_id,
    restaurant_id: order.restaurant_id,
    address_id: order.address_id,
    coupon_id: order.coupon_id,
    status: order.status,
    subtotal: order.subtotal,
    packaging_fee: order.packaging_fee,
    delivery_fee: order.delivery_fee,
    tax_amount: order.tax_amount,
    discount_amount: order.discount_amount,
    total_amount: order.total_amount,
    distance_km: order.distance_km,
    placed_at: order.placed_at,
    cancellable_until: order.cancellable_until,
    promised_at: order.promised_at,
    cancelled_at: order.cancelled_at,
    cancellation_reason: order.cancellation_reason,
    // Added with orders.delivery_note. Carried on the list row and not only the
    // detail, because an operator triaging a late delivery needs to see "leave
    // it at the gate" without opening the ticket.
    delivery_note: order.delivery_note,
    delivered_at: order.delivered_at,
  };
}

/** Every order, oldest first. The base every aggregate is computed over. */
export function allOrderDetails(): readonly OrderDetail[] {
  return SEED_ORDERS;
}

export function findOrderDetail(orderId: number): OrderDetail | null {
  return SEED_ORDERS.find((order) => order.id === orderId) ?? null;
}

/** The instant a window of whole days opened. Zero days means "all time". */
export function windowStart(days: number, nowMs: number): number {
  return days <= 0 ? 0 : nowMs - days * MS_PER_DAY;
}

/** Orders placed inside the window, or all of them when it is zero. */
export function withinDays(
  orders: readonly OrderDetail[],
  days: number,
  nowMs: number,
): readonly OrderDetail[] {
  if (days <= 0) return orders;
  const from = windowStart(days, nowMs);
  return orders.filter((order) => Date.parse(order.placed_at) >= from);
}

const SORTERS: Readonly<Record<OrderSort, (a: OrderRead, b: OrderRead) => number>> = {
  newest: (a, b) => Date.parse(b.placed_at) - Date.parse(a.placed_at),
  oldest: (a, b) => Date.parse(a.placed_at) - Date.parse(b.placed_at),
  largest: (a, b) => toPaise(b.total_amount) - toPaise(a.total_amount),
  // Oldest promise first, which on a live list is the most overdue first.
  latest_promise: (a, b) => Date.parse(a.promised_at) - Date.parse(b.promised_at),
};

/** id -> the words a search should match against, built once per query. */
function searchIndex(): ReadonlyMap<number, string> {
  const customers = new Map(allCustomers().map((row) => [row.id, row]));
  const restaurants = new Map(allRestaurants().map((row) => [row.id, row]));
  return new Map(
    SEED_ORDERS.map((order) => {
      const customer = customers.get(order.user_id);
      const restaurant = restaurants.get(order.restaurant_id);
      return [
        order.id,
        [
          String(order.id),
          customer?.name ?? "",
          customer?.email ?? "",
          customer?.phone ?? "",
          restaurant?.name ?? "",
        ].join(" "),
      ];
    }),
  );
}

function selectOrders(query: OrderQuery): readonly OrderRead[] {
  const term = query.q.trim();
  const index = term === "" ? null : searchIndex();
  const nowMs = Date.now();

  const filtered = withinDays(SEED_ORDERS, query.withinDays, nowMs).filter((order) => {
    if (query.liveOnly && !isLive(order)) return false;
    if (!query.liveOnly && query.status !== null && order.status !== query.status) {
      return false;
    }
    if (query.restaurantId !== null && order.restaurant_id !== query.restaurantId) {
      return false;
    }
    if (index === null) return true;
    return matches(index.get(order.id) ?? "", term);
  });

  return filtered.map(toOrderRead).sort(SORTERS[query.sort]);
}

export const fixtureOrders: OrdersService = {
  listOrders: (query) => settle(toPage(selectOrders(query), query)),

  // async so a missing order rejects rather than throwing synchronously out of
  // the service call — every caller is awaiting a promise, not a value.
  getOrder: async (orderId) => {
    const order = findOrderDetail(orderId);
    if (order === null) {
      throw new NotFoundError(`No order with id ${String(orderId)}.`);
    }
    return settle(order);
  },

  listEvents: (orderId) => settle(eventsFor(orderId)),

  listByCustomer: (userId, query) =>
    settle(
      toPage(
        SEED_ORDERS.filter((order) => order.user_id === userId)
          .map(toOrderRead)
          .sort(SORTERS.newest),
        query,
      ),
    ),

  getDelivery: (orderId) => settle(findDeliveryForOrder(orderId)),

  getDeliveriesFor: (orderIds) => {
    const wanted = new Set(orderIds);
    const found = new Map<number, DeliveryDetail>();
    for (const delivery of allDeliveries()) {
      if (wanted.has(delivery.order_id)) found.set(delivery.order_id, delivery);
    }
    return settle(found);
  },
};
