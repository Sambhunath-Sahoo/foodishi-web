/**
 * Every order on the platform, against the live API.
 *
 * The board reads `GET /admin/orders`, not the `GET /orders` the partner console
 * uses. They look alike and are not: the partner route's restaurant scope comes
 * from a dependency resolved against `restaurant_staff`, and an operator asks a
 * different question — "find this order anywhere" — so the platform-wide board
 * got its own route under the platform-role guard rather than widening that one.
 *
 * The single-order reads below are the shared `/orders/{id}` routes, because they
 * are guarded by `readable_order`, which admits the customer, the kitchen cooking
 * the food, and platform staff. Nothing platform-specific to add, so nothing
 * platform-specific was built.
 *
 * No `signal` argument anywhere: the interfaces in ../types take none.
 */
import { api, isApiError } from "@repo/api-client";
import type { components } from "@repo/api-client";
import type {
  DeliveryDetail,
  OrderDetail,
  OrderEventRead,
  OrderRead,
  Page,
} from "../../api-types";
import type { OrderQuery, OrderSort, OrdersService, PageQuery } from "../types";

/** Aliased off the generated schema so a renamed sort is a compile error here
 *  rather than a 422 the first time somebody clicks the column. */
type AdminOrderSort = components["schemas"]["AdminOrderSort"];

/**
 * The console's sort names, mapped onto the API's.
 *
 * Three are identical. The fourth is the same ordering under two names: the
 * console calls it `latest_promise` and the API calls it `oldest_promise`, and
 * both mean oldest promise first — which on a live list is the most overdue
 * first. Sending the console's word straight through would be a 422.
 */
const SORT_PARAMS: Readonly<Record<OrderSort, AdminOrderSort>> = {
  newest: "newest",
  oldest: "oldest",
  largest: "largest",
  latest_promise: "oldest_promise",
};

/** `q` is `Query(min_length=1)` on both order routes: an empty search box is an
 *  absent parameter, never an empty one. */
function searchTerm(q: string): string | undefined {
  const term = q.trim();
  return term === "" ? undefined : term;
}

export const apiOrders: OrdersService = {
  listOrders(query: OrderQuery) {
    // Every field of OrderQuery has a parameter waiting for it, including the
    // override: `liveOnly` beats `status` here because the server resolves the
    // two that way, so the console's documented precedence and the API's are the
    // same rule stated once rather than a client-side filter guessing at it.
    return api.get<Page<OrderRead>>("/admin/orders", {
      query: {
        q: searchTerm(query.q),
        status: query.status,
        restaurant_id: query.restaurantId,
        live: query.liveOnly,
        within_days: query.withinDays,
        sort: SORT_PARAMS[query.sort],
        limit: query.limit,
        offset: query.offset,
      },
    });
  },

  getOrder(orderId) {
    return api.get<OrderDetail>(`/orders/${orderId}`);
  },

  listEvents(orderId) {
    // A bare list, not a Page: the status trail of one order is short and the
    // timeline wants all of it.
    return api.get<readonly OrderEventRead[]>(`/orders/${orderId}/events`);
  },

  listByCustomer(userId, query: PageQuery) {
    // `GET /orders`, NOT `/admin/orders`, and the difference matters.
    //
    // `/admin/orders` has no `user_id` parameter — its filters are q, status,
    // restaurant_id, live, within_days and sort. FastAPI ignores query params it
    // does not declare, so `/admin/orders?user_id=7` answers 200 with every order
    // on the platform, and the customer drawer would report the platform's order
    // count as one person's lifetime spend. A wrong number that looks right.
    //
    // The partner route does declare `user_id`, and its restaurant scope is not
    // a wall here: `dependencies/scope.order_list_restaurants` enumerates every
    // restaurant for platform staff precisely so the console can read across the
    // platform. It is already ordered newest first with `id` breaking ties, which
    // is what this method promises.
    return api.get<Page<OrderRead>>("/orders", {
      query: {
        user_id: userId,
        limit: query.limit,
        offset: query.offset,
      },
    });
  },

  async getDelivery(orderId) {
    // "No rider assigned yet" is an ordinary state, not a failure. A rider is
    // attached at pickup, so for most of an order's life there is no delivery row
    // and the endpoint answers 404 — which `api.get` throws. Letting that reach
    // the caller would paint an error on the panel of an order that is simply
    // still being cooked.
    //
    // Narrow on purpose: only 404 becomes null. A 401, a 403, a timeout or a 500
    // are re-thrown, because "we could not tell you" and "there is no rider" are
    // different answers and a screen that folds them together stops being worth
    // reading.
    //
    // The one ambiguity is by design upstream: `readable_order` answers 404 for
    // "not your order" as well, so the two are indistinguishable by status. An
    // operator passes that guard for every order on the platform, so here a 404
    // can only mean the delivery row is absent.
    try {
      return await api.get<DeliveryDetail>(`/orders/${orderId}/delivery`);
    } catch (error) {
      if (isApiError(error) && error.status === 404) return null;
      throw error;
    }
  },

  async getDeliveriesFor(orderIds) {
    // One request per id, which is the honest cost of the routes that exist.
    //
    // `GET /admin/deliveries` does return rides with their order joined on, and
    // it is the right call for the deliveries board — but it filters by search
    // term and lifecycle status, not by a set of order ids. Reading `status=active`
    // and intersecting would be one request and quietly wrong: a ride that failed
    // under an order still in flight is exactly the row an operator is looking
    // for, and it would be the one row missing.
    //
    // Bounded by the caller rather than by this code: `useOrderDeliveries` passes
    // only the ids in the last live states, because a rider is assigned at pickup
    // and no earlier order can have one. Issued together so the board waits one
    // round trip, not N.
    const found = await Promise.all(
      orderIds.map(async (orderId) => ({
        orderId,
        delivery: await apiOrders.getDelivery(orderId),
      })),
    );

    return new Map(
      found
        .filter(
          (row): row is { orderId: number; delivery: DeliveryDetail } =>
            row.delivery !== null,
        )
        .map((row) => [row.orderId, row.delivery]),
    );
  },
};
