"use client";

import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { Workload } from "../services/types";
import type {
  OrderFunnel,
  OrdersOverTimePoint,
  Page,
  PlatformSummary,
  RestaurantMetrics,
} from "../api-types";
import { services } from "../services";
import { keys } from "./keys";

/** The board is watched, not read — 15s, as the operations brief asks. */
export const LIVE_REFETCH_MS = 15_000;

/** Metrics change on the minute, not the second. */
export const METRICS_STALE_MS = 30_000;

export function useSummary(): UseQueryResult<PlatformSummary> {
  return useQuery({
    queryKey: keys.metrics.summary(),
    queryFn: () => services.metrics.getSummary(),
    refetchInterval: LIVE_REFETCH_MS,
    staleTime: METRICS_STALE_MS,
  });
}

/**
 * The figures the sidebar reports.
 *
 * Repolled on the same beat as the live board, because a navigation that told
 * you fourteen refunds were late twenty minutes ago is worse than one that said
 * nothing: you would trust it. One request for all eight figures — see
 * `Workload` for why it is not six.
 */
export function useWorkload(): UseQueryResult<Workload> {
  return useQuery({
    queryKey: keys.metrics.workload(),
    queryFn: () => services.metrics.getWorkload(),
    refetchInterval: LIVE_REFETCH_MS,
    staleTime: METRICS_STALE_MS,
    // The rail is chrome: it must hold its last figures while a repoll or a
    // post-navigation refetch is in flight, never fall back to nothing.
    placeholderData: keepPreviousData,
  });
}

export function useOrdersOverTime(
  days: number,
): UseQueryResult<readonly OrdersOverTimePoint[]> {
  return useQuery({
    queryKey: keys.metrics.overTime(days),
    queryFn: () => services.metrics.listOrdersOverTime(days),
    staleTime: METRICS_STALE_MS,
  });
}

export function useFunnel(): UseQueryResult<OrderFunnel> {
  return useQuery({
    queryKey: keys.metrics.funnel(),
    queryFn: () => services.metrics.getFunnel(),
    staleTime: METRICS_STALE_MS,
  });
}

export function useRestaurantMetrics(): UseQueryResult<Page<RestaurantMetrics>> {
  return useQuery({
    queryKey: keys.metrics.restaurants(),
    queryFn: () => services.metrics.listRestaurantMetrics(),
    staleTime: METRICS_STALE_MS,
  });
}
