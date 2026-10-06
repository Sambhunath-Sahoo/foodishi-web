"use client";

import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
  DeliveryDetail,
  OrderDetail,
  OrderEventRead,
  OrderRead,
  Page,
} from "../api-types";
import { services } from "../services";
import type { OrderQuery } from "../services/types";
import { fingerprint, keys } from "./keys";
import { LIVE_REFETCH_MS, METRICS_STALE_MS } from "./metrics";

/** One page of the orders board. Enough rows to fill the deck twice. */
export const ORDER_PAGE_SIZE = 50;

/** The live board reads in one page; nothing on the platform runs past this. */
export const MAX_PAGE_SIZE = 100;

/** A rider changes far less often than the board repolls. */
export const RIDER_STALE_MS = 60_000;

/**
 * The orders board: every order on the platform, filtered and paged.
 *
 * The filter object is turned into one key string so two different filters are
 * two cache entries and going back to a previous filter is instant.
 */
export function useOrdersBoard(query: OrderQuery): UseQueryResult<Page<OrderRead>> {
  return useQuery({
    queryKey: keys.orders.board(
      fingerprint({
        q: query.q,
        status: query.status,
        restaurantId: query.restaurantId,
        liveOnly: query.liveOnly,
        withinDays: query.withinDays,
        sort: query.sort,
        limit: query.limit,
        offset: query.offset,
      }),
    ),
    queryFn: () => services.orders.listOrders(query),
    staleTime: METRICS_STALE_MS,
  });
}

/**
 * Every order still in flight, across the whole platform.
 *
 * Repolled rather than read: this is the one view somebody sits in front of, and
 * an order that went out for delivery two minutes ago has to appear without a
 * refresh. The 15s interval is stated on screen beside the live dot.
 */
export function useLiveOrders(): UseQueryResult<Page<OrderRead>> {
  return useQuery({
    queryKey: keys.orders.live(),
    queryFn: () =>
      services.orders.listOrders({
        q: "",
        status: null,
        restaurantId: null,
        liveOnly: true,
        withinDays: 0,
        sort: "latest_promise",
        limit: MAX_PAGE_SIZE,
        offset: 0,
      }),
    refetchInterval: LIVE_REFETCH_MS,
    staleTime: 0,
    // Read by the rail on every page; see useWorkload for why it holds on.
    placeholderData: keepPreviousData,
  });
}

export function useOrderDetail(orderId: number | null): UseQueryResult<OrderDetail> {
  return useQuery({
    queryKey: keys.orders.detail(orderId),
    enabled: orderId !== null,
    queryFn: () => services.orders.getOrder(orderId ?? 0),
  });
}

export function useOrderEvents(
  orderId: number | null,
): UseQueryResult<readonly OrderEventRead[]> {
  return useQuery({
    queryKey: keys.orders.events(orderId),
    enabled: orderId !== null,
    queryFn: () => services.orders.listEvents(orderId ?? 0),
  });
}

/**
 * The order's rider, or null when nobody has been assigned yet.
 *
 * "No rider" is the ordinary answer for most of an order's life — one is
 * attached at pickup — so it is an answer here rather than a failure.
 */
export function useOrderDelivery(
  orderId: number | null,
): UseQueryResult<DeliveryDetail | null> {
  return useQuery({
    queryKey: keys.orders.delivery(orderId),
    enabled: orderId !== null,
    queryFn: () => services.orders.getDelivery(orderId ?? 0),
    staleTime: RIDER_STALE_MS,
  });
}

/**
 * order id -> its delivery, for the rows on a board that can have one.
 *
 * One call for the whole board rather than one per row: a rider is assigned at
 * pickup, so only the last two live states have anything to look up, and the
 * caller passes just those ids.
 */
export function useOrderDeliveries(
  orderIds: readonly number[],
): UseQueryResult<ReadonlyMap<number, DeliveryDetail>> {
  const ids = [...orderIds].sort((left, right) => left - right);

  return useQuery({
    queryKey: keys.orders.deliveriesFor(ids.join(",")),
    enabled: ids.length > 0,
    queryFn: () => services.orders.getDeliveriesFor(ids),
    staleTime: RIDER_STALE_MS,
  });
}

/**
 * One customer's orders, newest first.
 *
 * This is what a per-customer aggregate is built from: order count, lifetime
 * spend and last-order date are summed in the drawer, for the one customer
 * whose panel is open. Doing it for every row of a directory page is why the
 * table behind it has no such columns.
 */
export function useCustomerOrders(
  userId: number | null,
): UseQueryResult<Page<OrderRead>> {
  return useQuery({
    queryKey: keys.orders.byCustomer(userId),
    enabled: userId !== null,
    queryFn: () =>
      services.orders.listByCustomer(userId ?? 0, { limit: MAX_PAGE_SIZE, offset: 0 }),
    staleTime: METRICS_STALE_MS,
  });
}
