"use client";

/**
 * Reports and payouts — read-only, both of them.
 *
 * The window is part of every key, so switching from 7 days to 30 is a
 * different query rather than a refetch that briefly draws a month's revenue
 * under a week's label.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { services } from "../services";
import { SLOW_REFRESH_MS, queryKeys } from "../query-keys";
import type { ReadyKitchen } from "../kitchen";
import type {
  EarningsSummary,
  LedgerEntry,
  Page,
  PerformanceReport,
  PopularItem,
  ReportWindow,
  SalesDay,
  Settlement,
} from "../types";

export function useSalesReport(
  kitchen: ReadyKitchen,
  window: ReportWindow,
): UseQueryResult<readonly SalesDay[]> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.salesReport(userId, restaurantId, window),
    retry: false,
    // Today's row keeps moving while the restaurant is trading.
    refetchInterval: SLOW_REFRESH_MS,
    queryFn: ({ signal }) => services.reports.sales(restaurantKey, window, signal),
  });
}

export function usePopularItems(
  kitchen: ReadyKitchen,
  window: ReportWindow,
): UseQueryResult<readonly PopularItem[]> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.popularItems(userId, restaurantId, window),
    retry: false,
    queryFn: ({ signal }) =>
      services.reports.popularItems(restaurantKey, window, signal),
  });
}

export function usePerformance(
  kitchen: ReadyKitchen,
  window: ReportWindow,
): UseQueryResult<PerformanceReport> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.performance(userId, restaurantId, window),
    retry: false,
    queryFn: ({ signal }) => services.reports.performance(restaurantKey, window, signal),
  });
}

export function useEarnings(
  kitchen: ReadyKitchen,
  window: ReportWindow,
): UseQueryResult<EarningsSummary> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.earnings(userId, restaurantId, window),
    retry: false,
    queryFn: ({ signal }) => services.payments.earnings(restaurantKey, window, signal),
  });
}

export function useSettlements(
  kitchen: ReadyKitchen,
): UseQueryResult<readonly Settlement[]> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.settlements(userId, restaurantId),
    retry: false,
    queryFn: ({ signal }) => services.payments.settlements(restaurantKey, signal),
  });
}

export function useLedger(
  kitchen: ReadyKitchen,
  limit: number,
  offset: number,
): UseQueryResult<Page<LedgerEntry>> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.ledger(userId, restaurantId, offset),
    retry: false,
    queryFn: ({ signal }) =>
      services.payments.ledger(restaurantKey, limit, offset, signal),
  });
}
