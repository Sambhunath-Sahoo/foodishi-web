"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  Page,
  PaymentRead,
  PaymentStatus,
  RefundDetail,
  RefundRead,
} from "../api-types";
import { services } from "../services";
import type {
  CommissionLedger,
  RefundQuery,
  RefundTally,
  TransactionQuery,
} from "../services/types";
import { fingerprint, keys } from "./keys";
import { METRICS_STALE_MS } from "./metrics";

/** One page of the transactions ledger. */
export const TRANSACTION_PAGE_SIZE = 40;

/** One page of the refunds queue. Shorter: each row is a decision. */
export const REFUND_PAGE_SIZE = 30;

/** Days of delivered orders the commission ledger covers by default. */
export const LEDGER_DEFAULT_DAYS = 30;

export function useTransactions(
  query: TransactionQuery,
): UseQueryResult<Page<PaymentRead>> {
  return useQuery({
    queryKey: keys.finance.transactions(
      fingerprint({
        q: query.q,
        // Joined so the cache key differs between ["refunded"] and
        // ["refunded","partially_refunded"] — two genuinely different queries.
        statuses: query.statuses === null ? null : [...query.statuses].join(","),
        method: query.method,
        limit: query.limit,
        offset: query.offset,
      }),
    ),
    queryFn: () => services.finance.listTransactions(query),
    staleTime: METRICS_STALE_MS,
  });
}

/**
 * Refunds, worst first, carrying the platform's own SLA verdict.
 *
 * `sla_breached` is decided at the source rather than in the page, so the SLA
 * watch and the payments view can never disagree about which refunds are late.
 */
export function useRefunds(query: RefundQuery): UseQueryResult<Page<RefundDetail>> {
  return useQuery({
    queryKey: keys.finance.refunds(
      fingerprint({
        q: query.q,
        status: query.status,
        breachedOnly: query.breachedOnly,
        limit: query.limit,
        offset: query.offset,
      }),
    ),
    queryFn: () => services.finance.listRefunds(query),
    staleTime: METRICS_STALE_MS,
  });
}

/** One count per payment status, for the transaction board's stage cards. */
export function usePaymentCounts(): UseQueryResult<
  Readonly<Record<PaymentStatus, number>>
> {
  return useQuery({
    queryKey: keys.finance.paymentCounts(),
    queryFn: () => services.finance.countPaymentsByStatus(),
    staleTime: METRICS_STALE_MS,
  });
}

/**
 * The refund queue's shape: one count per status, plus what is breached and owed.
 *
 * The breached count and the money come back with the counts rather than being
 * summed from a page, because the page is thirty rows of a queue that may be
 * longer — a footer that added up what it could see would understate the debt.
 */
export function useRefundCounts(): UseQueryResult<RefundTally> {
  return useQuery({
    queryKey: keys.finance.refundCounts(),
    queryFn: () => services.finance.countRefunds(),
    staleTime: METRICS_STALE_MS,
  });
}

export function useOrderPayments(
  orderId: number | null,
): UseQueryResult<Page<PaymentRead>> {
  return useQuery({
    queryKey: keys.orders.payments(orderId),
    enabled: orderId !== null,
    queryFn: () => services.finance.listPaymentsForOrder(orderId ?? 0),
  });
}

export function useOrderRefunds(
  orderId: number | null,
): UseQueryResult<Page<RefundRead>> {
  return useQuery({
    queryKey: keys.orders.refunds(orderId),
    enabled: orderId !== null,
    queryFn: () => services.finance.listRefundsForOrder(orderId ?? 0),
  });
}

/** What each kitchen earned, what the platform kept, and what it owes. */
export function useLedger(days: number): UseQueryResult<CommissionLedger> {
  return useQuery({
    queryKey: keys.finance.ledger(days),
    queryFn: () => services.finance.getLedger(days),
    staleTime: METRICS_STALE_MS,
  });
}

/**
 * The two things an operator can do to a stuck refund.
 *
 * Both invalidate the metrics tree with the finance tree, because the overview's
 * breached-refund alarm counts exactly these rows — settling one has to put that
 * number down.
 */
function useRefundAction(
  act: (refundId: number) => Promise<RefundDetail>,
): UseMutationResult<RefundDetail, Error, number> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: act,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.finance.all });
      void client.invalidateQueries({ queryKey: keys.metrics.all });
      void client.invalidateQueries({ queryKey: keys.orders.all });
    },
  });
}

/** Send it back to the provider. It becomes "processing", not "done". */
export function useRetryRefund(): UseMutationResult<RefundDetail, Error, number> {
  return useRefundAction((refundId) => services.finance.retryRefund(refundId));
}

/** Settle it by hand, for when the money has been moved another way. */
export function useCompleteRefund(): UseMutationResult<RefundDetail, Error, number> {
  return useRefundAction((refundId) => services.finance.completeRefund(refundId));
}
