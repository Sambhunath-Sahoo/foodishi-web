"use client";

/**
 * The caller's own applications to join Foodishi.
 *
 * Read by the screen an account with no kitchen lands on, and written by the
 * apply form. A successful submit invalidates BOTH this key and the session:
 * the session is what the shell reads to decide whether this account works
 * anywhere, and an approval landing between two polls is exactly the moment
 * the console should stop saying "waiting" and start showing a kitchen.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { services } from "../services";
import { queryKeys } from "../query-keys";
import type { ApplicationSubmit, RestaurantApplication } from "../types";

/**
 * How often a waiting applicant's screen re-reads.
 *
 * Slower than anything in the kitchen, and deliberately: an approval is a human
 * decision taken over hours, so polling it like an order queue would be a
 * request a minute for a change that comes once. Slow enough to be cheap, quick
 * enough that somebody who was just told "you're in" on the phone sees it
 * without reloading.
 */
export const APPLICATION_POLL_MS = 120_000;

export function useMyApplications(
  userId: string,
): UseQueryResult<readonly RestaurantApplication[]> {
  return useQuery({
    queryKey: queryKeys.myApplications(userId),
    queryFn: ({ signal }) => services.applications.listMine(signal),
    refetchInterval: APPLICATION_POLL_MS,
  });
}

export function useSubmitApplication(
  userId: string,
): UseMutationResult<RestaurantApplication, Error, ApplicationSubmit> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (details: ApplicationSubmit) =>
      services.applications.submit(details),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.myApplications(userId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auth() }),
      ]);
    },
  });
}
