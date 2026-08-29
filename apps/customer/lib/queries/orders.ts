"use client";

import { useMutation, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { services } from "../services";
import type {
  Address,
  CancelResult,
  OrderDetail,
  OrderEvent,
  OrderRead,
  OrderStatusRead,
  Page,
  Payment,
  Quote,
  QuoteRequest,
} from "../types";
import { hasOpenPayment, type PaymentMethod } from "../payment";
import { isSettled } from "../lifecycle";

/** The tracking screen refreshes itself; nothing else on the app polls. */
export const STATUS_POLL_MS = 10_000;
/**
 * Payments are polled more slowly than the status. A capture arrives from
 * outside this app entirely — a gateway, or an operator holding the webhook
 * secret — so there is nothing the customer is waiting on second by second,
 * but without a poll an order settled out of band would read "authorized"
 * until the page was reloaded by hand.
 */
export const PAYMENT_POLL_MS = 20_000;
/**
 * Only the "In progress" list refreshes itself, and slowly: those rows carry a
 * status and a countdown that the tracking screen may already know are old,
 * and a customer watching this list has no other way to find out.
 */
export const HISTORY_LIVE_POLL_MS = 30_000;
export const HISTORY_PAGE_SIZE = 10;

export function useAddresses(userId: number | null): UseQueryResult<readonly Address[]> {
  return useQuery({
    queryKey: ["addresses", userId],
    enabled: userId !== null,
    queryFn: () => services.orders.listAddresses(userId as number),
  });
}

/**
 * The live price. This runs on every cart change because the quote endpoint is
 * the only thing allowed to decide what an order costs — the number shown here
 * is the number POST /orders will charge, since both call the same service.
 */
export function useQuote(
  request: QuoteRequest | null,
  userId: number | null,
): UseQueryResult<Quote> {
  return useQuery({
    queryKey: ["quote", request, userId],
    enabled: request !== null,
    // A stale price is worse than a spinner.
    staleTime: 0,
    // Keep the last good breakdown on screen while the next one lands, so the
    // panel does not collapse every time a quantity ticks.
    placeholderData: (previous) => previous,
    queryFn: () => services.orders.quote(request as QuoteRequest, userId),
  });
}

export interface PlaceOrderInput {
  readonly userId: number;
  readonly request: QuoteRequest;
  /** One UUID per attempt; reused on a network retry so nothing doubles up. */
  readonly idempotencyKey: string;
  /** "Leave it at the gate." Goes with the order; see PlaceOrderCommand. */
  readonly deliveryNote: string | null;
}

export function usePlaceOrder() {
  return useMutation<OrderDetail, unknown, PlaceOrderInput>({
    mutationFn: ({ userId, request, idempotencyKey, deliveryNote }) =>
      services.orders.placeOrder({
        userId,
        request,
        idempotencyKey,
        deliveryNote,
      }),
  });
}

export function useOrder(orderId: number | null): UseQueryResult<OrderDetail> {
  return useQuery({
    queryKey: ["order", orderId],
    enabled: orderId !== null,
    queryFn: () => services.orders.getOrder(orderId as number),
  });
}

export function useOrderStatus(
  orderId: number | null,
): UseQueryResult<OrderStatusRead> {
  return useQuery({
    queryKey: ["order-status", orderId],
    enabled: orderId !== null,
    staleTime: 0,
    /**
     * Delivered and cancelled orders never change again; polling them is waste.
     *
     * The terminal check reads *this query's own last answer* rather than a
     * flag passed in by the screen. It used to take one, computed from the
     * order detail — which is fetched once — so an order that reached
     * `delivered` while the page sat open kept the timer running forever: the
     * only source that knew it had settled was the poll being asked whether to
     * stop.
     */
    refetchInterval: (query) =>
      isSettled(query.state.data?.status) ? false : STATUS_POLL_MS,
    queryFn: () => services.orders.getOrderStatus(orderId as number),
  });
}

/**
 * The status trail. `status` is part of the key on purpose: the tracking screen
 * polls /status every 10s, and the moment that answer changes the trail is
 * stale, so a new key refetches it without a second timer.
 */
export function useOrderEvents(
  orderId: number | null,
  status: string | undefined,
): UseQueryResult<readonly OrderEvent[]> {
  return useQuery({
    queryKey: ["order-events", orderId, status],
    enabled: orderId !== null,
    placeholderData: (previous) => previous,
    queryFn: () => services.orders.listOrderEvents(orderId as number),
  });
}

/**
 * The customer's own orders.
 *
 * `GET /orders?user_id=` is not the customer's list — the API turned it into
 * the staff-scoped queue and now ignores that parameter entirely. The
 * caller-scoped list is `GET /me/orders`, which reads the identity out of the
 * bearer token the fetcher attaches. `userId` stays in the query key only so
 * one customer's history is never served to the next one from cache.
 */
export function useOrderHistory(
  userId: number | null,
  offset: number,
  live: boolean,
): UseQueryResult<Page<OrderRead>> {
  return useQuery({
    queryKey: ["me-orders", userId, offset, live],
    enabled: userId !== null,
    refetchInterval: live ? HISTORY_LIVE_POLL_MS : false,
    queryFn: () => services.orders.listMyOrders(HISTORY_PAGE_SIZE, offset, live),
  });
}

export interface CancelOrderInput {
  readonly orderId: number;
  readonly userId: number | null;
  readonly reason?: string;
}

export function useCancelOrder() {
  return useMutation<CancelResult, unknown, CancelOrderInput>({
    mutationFn: ({ orderId, userId, reason }) =>
      services.orders.cancelOrder({ orderId, userId, reason }),
  });
}

/**
 * What has actually been captured for this order. The cancellation fee is
 * capped at that amount server-side, so the preview on the Cancel button
 * cannot be honest without it.
 */
export function useOrderPayments(
  orderId: number | null,
): UseQueryResult<Page<Payment>> {
  return useQuery({
    queryKey: ["order-payments", orderId],
    enabled: orderId !== null,
    // Money held is money the customer is waiting on, so the last answer is
    // never good enough while an attempt is still open.
    staleTime: 0,
    refetchInterval: (query) =>
      hasOpenPayment(query.state.data) ? PAYMENT_POLL_MS : false,
    queryFn: () => services.orders.listPayments(orderId as number),
  });
}

export interface CreatePaymentInput {
  readonly orderId: number;
  readonly method: PaymentMethod;
}

/**
 * Authorize the amount an order says is owed.
 *
 * The only write on the money path a browser is entitled to make. It creates
 * an AUTHORIZED row and nothing more: the capture is
 * POST /payments/{id}/callback, which is authenticated by a shared secret held
 * by the gateway, so this app cannot settle a payment and must not pretend to.
 *
 * No amount is sent — the server takes it from the order, so a client cannot
 * underpay — and no Idempotency-Key either: the route does not accept one
 * (payments has no column to record it in) and guards a double-tap with the
 * order's own state instead, answering 409 when an attempt is already open.
 * Callers treat that 409 as "re-read the list", never as a failure to pay.
 */
export function useCreatePayment() {
  return useMutation<Payment, unknown, CreatePaymentInput>({
    mutationFn: ({ orderId, method }) =>
      services.orders.createPayment(orderId, method),
  });
}

/** Only a captured payment is money the API is holding. */
export function sumCaptured(page: Page<Payment> | undefined): number {
  return (page?.items ?? [])
    .filter((payment) => payment.status === "captured")
    .reduce((total, payment) => total + Number.parseFloat(payment.amount || "0"), 0);
}
