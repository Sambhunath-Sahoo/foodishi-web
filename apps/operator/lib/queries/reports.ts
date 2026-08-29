"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { services } from "../services";
import type {
  CommissionReport,
  CustomerReport,
  OrderReport,
  RestaurantReport,
  SalesReport,
} from "../services/types";
import { keys } from "./keys";
import { METRICS_STALE_MS } from "./metrics";

/**
 * The five reports. One window, asked five ways.
 *
 * Each is its own cache entry keyed by the window, so switching a report while
 * keeping the range redraws instantly and switching the range refetches only
 * the report on screen.
 */
export function useSalesReport(days: number): UseQueryResult<SalesReport> {
  return useQuery({
    queryKey: keys.reports.sales(days),
    queryFn: () => services.reports.sales({ days }),
    staleTime: METRICS_STALE_MS,
  });
}

export function useRestaurantReport(days: number): UseQueryResult<RestaurantReport> {
  return useQuery({
    queryKey: keys.reports.restaurants(days),
    queryFn: () => services.reports.restaurants({ days }),
    staleTime: METRICS_STALE_MS,
  });
}

export function useOrderReport(days: number): UseQueryResult<OrderReport> {
  return useQuery({
    queryKey: keys.reports.orders(days),
    queryFn: () => services.reports.orders({ days }),
    staleTime: METRICS_STALE_MS,
  });
}

export function useCustomerReport(days: number): UseQueryResult<CustomerReport> {
  return useQuery({
    queryKey: keys.reports.customers(days),
    queryFn: () => services.reports.customers({ days }),
    staleTime: METRICS_STALE_MS,
  });
}

export function useCommissionReport(days: number): UseQueryResult<CommissionReport> {
  return useQuery({
    queryKey: keys.reports.commission(days),
    queryFn: () => services.reports.commission({ days }),
    staleTime: METRICS_STALE_MS,
  });
}
