"use client";

/**
 * Reading and moving orders.
 *
 * One rule holds this file together: **moving any order makes the same four
 * reads stale** — the live queue it sits in, the ticket itself, the clock the
 * detail screen polls, and the status trail. Naming that set once means a fifth
 * key is added in one place instead of in every control that can move an order,
 * which is how two controls on the same card end up disagreeing about what is
 * fresh.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { services } from "../services";
import {
  FROZEN_STALE_MS,
  QUEUE_REFRESH_MS,
  REFERENCE_STALE_MS,
  queryKeys,
} from "../query-keys";
import type { ReadyKitchen } from "../kitchen";
import type {
  Address,
  CancelResult,
  Customer,
  Order,
  OrderClock,
  OrderDetail,
  OrderEvent,
  OrderStatus,
  OrdersPage,
} from "../types";
import type { OrderQuery } from "../services/types";

/** The kitchen never has fifty tickets in flight; this is a safety rail. */
const LIVE_PAGE_SIZE = 50;

export function invalidateAfterOrderWrite(
  queryClient: QueryClient,
  userId: string,
  restaurantId: string,
  orderId: string,
): void {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.liveOrders(userId, restaurantId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.order(userId, orderId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.orderClock(userId, orderId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.orderEvents(userId, orderId),
  });
  // The history and the reports counted this order too. Prefix invalidation
  // rather than a list of windows: a screen showing "last 7 days" and one
  // showing "today" are different keys and both just changed.
  void queryClient.invalidateQueries({ queryKey: ["orders", "history"] });
  void queryClient.invalidateQueries({ queryKey: ["reports"] });
  void queryClient.invalidateQueries({ queryKey: ["payments"] });
}

export function useLiveOrders(kitchen: ReadyKitchen): UseQueryResult<OrdersPage> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.liveOrders(userId, restaurantId),
    refetchInterval: QUEUE_REFRESH_MS,
    queryFn: ({ signal }) =>
      services.orders.list(
        { restaurantId: restaurantKey, live: true, limit: LIVE_PAGE_SIZE, offset: 0 },
        signal,
      ),
  });
}

/** A filtered, paged read for the history board and the reports drill-downs. */
export function useOrderHistory(
  kitchen: ReadyKitchen,
  filter: Omit<OrderQuery, "restaurantId">,
): UseQueryResult<OrdersPage> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.orderHistory(userId, restaurantId, filter),
    queryFn: ({ signal }) =>
      services.orders.list({ ...filter, restaurantId: restaurantKey }, signal),
  });
}

export function useOrder(
  kitchen: ReadyKitchen,
  orderId: string,
  options?: { readonly frozen?: boolean },
): UseQueryResult<OrderDetail> {
  return useQuery({
    queryKey: queryKeys.order(kitchen.userId, orderId),
    // A placed order's lines never change, so a queue card reads them once.
    // The detail screen wants the status too, and asks for it fresh.
    staleTime: options?.frozen === true ? FROZEN_STALE_MS : 0,
    queryFn: ({ signal }) => services.orders.get(Number(orderId), signal),
  });
}

export function useOrderClock(
  kitchen: ReadyKitchen,
  orderId: string,
): UseQueryResult<OrderClock> {
  return useQuery({
    queryKey: queryKeys.orderClock(kitchen.userId, orderId),
    refetchInterval: QUEUE_REFRESH_MS,
    queryFn: ({ signal }) => services.orders.getClock(Number(orderId), signal),
  });
}

export function useOrderEvents(
  kitchen: ReadyKitchen,
  orderId: string,
): UseQueryResult<readonly OrderEvent[]> {
  return useQuery({
    queryKey: queryKeys.orderEvents(kitchen.userId, orderId),
    queryFn: ({ signal }) => services.orders.listEvents(Number(orderId), signal),
  });
}

export function useCustomer(
  kitchen: ReadyKitchen,
  customerId: number,
): UseQueryResult<Customer> {
  return useQuery({
    queryKey: queryKeys.customer(kitchen.userId, customerId),
    staleTime: REFERENCE_STALE_MS,
    // A 403 here is the designed answer — the customer's details are theirs —
    // so it is asked once and not retried into a red screen.
    retry: false,
    queryFn: ({ signal }) => services.orders.getCustomer(customerId, signal),
  });
}

export function useAddress(
  kitchen: ReadyKitchen,
  addressId: number,
): UseQueryResult<Address> {
  return useQuery({
    queryKey: queryKeys.address(kitchen.userId, addressId),
    staleTime: REFERENCE_STALE_MS,
    retry: false,
    queryFn: ({ signal }) => services.orders.getAddress(addressId, signal),
  });
}

function useOrderWriteScope(
  kitchen: ReadyKitchen,
  orderId: number,
): () => void {
  const queryClient = useQueryClient();
  const { userId, restaurantId } = kitchen;
  return () =>
    invalidateAfterOrderWrite(queryClient, userId, restaurantId, String(orderId));
}

export function useOrderStatusMutation(
  kitchen: ReadyKitchen,
  orderId: number,
): UseMutationResult<Order, Error, OrderStatus> {
  const invalidate = useOrderWriteScope(kitchen, orderId);
  return useMutation({
    mutationFn: (status: OrderStatus) =>
      services.orders.updateStatus({ orderId, status }),
    onSuccess: invalidate,
  });
}

export interface BoardMove {
  readonly orderId: number;
  readonly status: OrderStatus;
}

/**
 * Move whichever ticket was just dropped.
 *
 * The board cannot use `useOrderStatusMutation`: that one takes its order id at
 * hook time, and a board holds a column of cards rather than one. So the id
 * travels with the call instead, and the invalidation rule at the top of this
 * file is reused verbatim — a move made by dragging has to leave exactly the
 * same four reads stale as a move made by tapping.
 */
export function useBoardStatusMutation(
  kitchen: ReadyKitchen,
): UseMutationResult<Order, Error, BoardMove> {
  const queryClient = useQueryClient();
  const { userId, restaurantId } = kitchen;
  return useMutation({
    mutationFn: ({ orderId, status }: BoardMove) =>
      services.orders.updateStatus({ orderId, status }),
    onSuccess: (_order, { orderId }) => {
      invalidateAfterOrderWrite(queryClient, userId, restaurantId, String(orderId));
    },
  });
}

export function useRejectOrderMutation(
  kitchen: ReadyKitchen,
  orderId: number,
): UseMutationResult<CancelResult, Error, string> {
  const invalidate = useOrderWriteScope(kitchen, orderId);
  return useMutation({
    mutationFn: (reason: string) => services.orders.reject({ orderId, reason }),
    onSuccess: invalidate,
  });
}

export function useCancelOrderMutation(
  kitchen: ReadyKitchen,
  orderId: number,
): UseMutationResult<CancelResult, Error, string> {
  const invalidate = useOrderWriteScope(kitchen, orderId);
  return useMutation({
    mutationFn: (reason: string) => services.orders.cancel({ orderId, reason }),
    onSuccess: invalidate,
  });
}
