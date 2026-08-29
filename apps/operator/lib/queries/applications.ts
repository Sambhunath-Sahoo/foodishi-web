"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { ApplicationStatus, Page, RestaurantApplicationRow } from "../api-types";
import { services } from "../services";
import { keys } from "./keys";

/**
 * The queue of restaurants asking to join, and the two answers.
 *
 * Both decisions invalidate more than this queue, and the approval is the reason:
 * it creates a kitchen. The catalogue, the overview's active-kitchen tile and
 * the commission ledger are all computed from `restaurants`, so a console where
 * approving an application left the catalogue at yesterday's count would be
 * worse than one with no count at all — the operator's next click would be on a
 * page that disagrees with the one they just used.
 *
 * The navigation's own figure is invalidated too: `metrics.workload` carries
 * `applications_pending`, which is the badge that brought them here.
 */

/** Ten rows: a worklist somebody reads top to bottom, not a board to scan. */
export const APPLICATION_PAGE_SIZE = 10;

export function useApplications(
  status: ApplicationStatus | null,
  offset: number,
): UseQueryResult<Page<RestaurantApplicationRow>> {
  return useQuery({
    queryKey: keys.applications.page(status ?? "any", offset),
    queryFn: () =>
      services.applications.listApplications({
        status,
        limit: APPLICATION_PAGE_SIZE,
        offset,
      }),
  });
}

function useInvalidateAfterDecision(): () => void {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: keys.applications.all });
    // An approval mints a restaurant. Everything downstream of the catalogue
    // has to be re-read, including the navigation's pending count.
    void client.invalidateQueries({ queryKey: keys.restaurants.all });
    void client.invalidateQueries({ queryKey: keys.metrics.all });
    void client.invalidateQueries({ queryKey: keys.reports.all });
  };
}

export interface ApproveApplicationInput {
  readonly applicationId: number;
  /** For the record, not for the applicant. Null when there is nothing to add. */
  readonly note: string | null;
}

export function useApproveApplication(): UseMutationResult<
  RestaurantApplicationRow,
  Error,
  ApproveApplicationInput
> {
  const invalidate = useInvalidateAfterDecision();
  return useMutation({
    mutationFn: ({ applicationId, note }: ApproveApplicationInput) =>
      services.applications.approveApplication(applicationId, note),
    onSuccess: invalidate,
  });
}

export interface RejectApplicationInput {
  readonly applicationId: number;
  /** Read verbatim by the applicant. Required, by the server and by the form. */
  readonly reason: string;
}

export function useRejectApplication(): UseMutationResult<
  RestaurantApplicationRow,
  Error,
  RejectApplicationInput
> {
  const invalidate = useInvalidateAfterDecision();
  return useMutation({
    mutationFn: ({ applicationId, reason }: RejectApplicationInput) =>
      services.applications.rejectApplication(applicationId, reason),
    onSuccess: invalidate,
  });
}
