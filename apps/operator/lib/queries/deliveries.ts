"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { DeliveryPartnerRead, DeliveryStatus, Page } from "../api-types";
import { services } from "../services";
import type { DeliveryBoardRow, DeliveryQuery } from "../services/types";
import { fingerprint, keys } from "./keys";
import { LIVE_REFETCH_MS } from "./metrics";
import { MAX_PAGE_SIZE } from "./orders";

/** One page of the deliveries board. */
export const DELIVERY_PAGE_SIZE = 40;

/**
 * Rides on the road, repolled like the order board.
 *
 * A delivery view that had to be refreshed by hand would be read once and
 * trusted for the rest of the shift, which is the one thing it must not be.
 */
export function useDeliveries(
  query: DeliveryQuery,
): UseQueryResult<Page<DeliveryBoardRow>> {
  return useQuery({
    queryKey: keys.deliveries.board(
      fingerprint({
        q: query.q,
        status: query.status,
        limit: query.limit,
        offset: query.offset,
      }),
    ),
    queryFn: () => services.deliveries.listDeliveries(query),
    refetchInterval: LIVE_REFETCH_MS,
    staleTime: 0,
  });
}

/**
 * Every ride still on the road, for counting rather than for showing.
 *
 * `workload.deliveries_late` counts stuck rides as late (OP-3), and the server
 * has no notion of stuck yet (AD-2), so the rail and the deliveries board split
 * late from stuck themselves from these rows — one shared request, read by both.
 * The board's own page cannot stand in for it: it is filtered and 40 rows long.
 * Previous rows are kept while a repoll is in flight so the badge never blinks.
 */
export function useActiveRides(): UseQueryResult<Page<DeliveryBoardRow>> {
  return useQuery({
    queryKey: keys.deliveries.active(),
    queryFn: () =>
      services.deliveries.listDeliveries({
        q: "",
        status: "active",
        limit: MAX_PAGE_SIZE,
        offset: 0,
      }),
    refetchInterval: LIVE_REFETCH_MS,
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

/**
 * One count per ride status, repolled with the board.
 *
 * Separate from the list because the cards have to keep counting the stages the
 * reader is NOT looking at — a card row fed from the current page's rows would
 * only ever be able to describe the filter already applied.
 */
export function useDeliveryCounts(): UseQueryResult<
  Readonly<Record<DeliveryStatus, number>>
> {
  return useQuery({
    queryKey: keys.deliveries.counts(),
    queryFn: () => services.deliveries.countByStatus(),
    refetchInterval: LIVE_REFETCH_MS,
    staleTime: 0,
  });
}

export function useDeliveryPartners(): UseQueryResult<readonly DeliveryPartnerRead[]> {
  return useQuery({
    queryKey: keys.deliveries.partners(),
    queryFn: () => services.deliveries.listPartners(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export interface ReassignInput {
  readonly deliveryId: number;
  readonly partnerId: number;
}

/**
 * Hand a stalled ride to somebody else.
 *
 * The order tree is invalidated alongside the board because the change is
 * recorded on the order's own status trail — a reassignment nobody could see in
 * the drawer afterwards is what makes the next support call unanswerable.
 */
export function useReassignDelivery(): UseMutationResult<
  DeliveryBoardRow,
  Error,
  ReassignInput
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ deliveryId, partnerId }: ReassignInput) =>
      services.deliveries.reassign(deliveryId, partnerId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.deliveries.all });
      void client.invalidateQueries({ queryKey: keys.orders.all });
    },
  });
}

export interface MarkFailedInput {
  readonly deliveryId: number;
  readonly reason: string;
}

export function useMarkDeliveryFailed(): UseMutationResult<
  DeliveryBoardRow,
  Error,
  MarkFailedInput
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ deliveryId, reason }: MarkFailedInput) =>
      services.deliveries.markFailed(deliveryId, reason),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.deliveries.all });
      void client.invalidateQueries({ queryKey: keys.orders.all });
    },
  });
}
