"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { AddressRead, Page, UserRead } from "../api-types";
import { services } from "../services";
import { keys } from "./keys";
import { METRICS_STALE_MS } from "./metrics";

/** Rows per page of the customer directory. Enough to fill the deck, not more. */
export const CUSTOMER_PAGE_SIZE = 25;

/** What the customers view asks the directory for. */
export interface CustomerFilters {
  /** Matched against name, email and phone. */
  readonly q: string;
  /** null means "either" — the predicate is omitted entirely. */
  readonly isActive: boolean | null;
  readonly offset: number;
}

/**
 * One page of the customer directory.
 *
 * Paged and filtered at the source rather than read whole and sliced here: a
 * search that quietly only looked at the twenty-five rows on screen would be
 * worse than no search at all, and the footer's total has to be the real one.
 */
export function useCustomers(
  filters: CustomerFilters,
): UseQueryResult<Page<UserRead>> {
  const { q, isActive, offset } = filters;

  return useQuery({
    queryKey: keys.customers.page(q, isActive, offset),
    queryFn: () =>
      services.people.listCustomers({
        q,
        isActive,
        limit: CUSTOMER_PAGE_SIZE,
        offset,
      }),
    staleTime: METRICS_STALE_MS,
  });
}

/**
 * How many customers the directory will read before it stops.
 *
 * The API caps `limit` at 100 per request (`MAX_LIMIT` in
 * app/core/pagination.py, and its comment says why: "an unbounded list endpoint
 * is the easiest way to..."), so the directory has to PAGE. This is the ceiling
 * on that paging.
 *
 * It used to pass `Number.MAX_SAFE_INTEGER` as the limit — a fixture-era "give
 * me everything" sentinel that bundled JSON happily ignored. Against the real
 * API it is a 422 on every page load: `GET /users?limit=9007199254740991`.
 *
 * 2,000 is deliberate rather than generous. It is twenty requests at the cap,
 * which is already more than a directory built this way should be doing; past
 * that the right fix is not a bigger number but fetching only the ids the
 * board actually references. The console says so below rather than paging
 * forever and looking fine until it does not.
 */
const DIRECTORY_MAX = 2_000;
const DIRECTORY_PAGE = 100;

/**
 * id -> the whole customer, for every registered account.
 *
 * A live board that names the kitchen but not the person waiting is half a
 * board, and order rows carry `user_id` only. The row carries `avatar_url`
 * along with the name, and the whole map is kept for the session.
 */
export function useCustomerDirectory(): UseQueryResult<ReadonlyMap<number, UserRead>> {
  return useQuery({
    queryKey: keys.customers.directory(),
    queryFn: async () => {
      const directory = new Map<number, UserRead>();
      let offset = 0;

      // Sequential, not parallel: the first response reports `total`, and
      // firing twenty speculative requests to save one round trip on a
      // session-cached read is the wrong trade.
      for (;;) {
        const page = await services.people.listCustomers({
          q: "",
          isActive: null,
          limit: DIRECTORY_PAGE,
          offset,
        });
        for (const row of page.items) directory.set(row.id, row);

        offset += page.items.length;
        const exhausted = page.items.length === 0 || offset >= page.total;
        if (exhausted || offset >= DIRECTORY_MAX) {
          if (!exhausted) {
            // Said out loud. A silently truncated directory renders order rows
            // as "#217" with no clue why, and somebody spends an afternoon on
            // it — the same failure the API's own pagination comment warns about.
            console.warn(
              `Customer directory stopped at ${String(offset)} of ${String(page.total)} accounts. ` +
                "Order rows for the rest will show an id instead of a name. " +
                "Fetch by referenced id rather than raising DIRECTORY_MAX.",
            );
          }
          break;
        }
      }
      return directory;
    },
    staleTime: METRICS_STALE_MS,
  });
}

export function useUser(userId: number | null): UseQueryResult<UserRead> {
  return useQuery({
    queryKey: keys.customers.one(userId),
    enabled: userId !== null,
    queryFn: () => services.people.getCustomer(userId ?? 0),
    staleTime: METRICS_STALE_MS,
  });
}

/**
 * A customer's saved addresses, all of them — nobody keeps enough to page.
 *
 * This is also the only door to an order's delivery address: the order carries
 * `address_id`, and an id that is not in this list means the customer has since
 * deleted it, which the drawer says rather than leaving the line blank.
 */
export function useUserAddresses(
  userId: number | null,
): UseQueryResult<readonly AddressRead[]> {
  return useQuery({
    queryKey: keys.customers.addresses(userId),
    enabled: userId !== null,
    queryFn: () => services.people.listAddresses(userId ?? 0),
    staleTime: METRICS_STALE_MS,
  });
}

/** How many accounts are switched off, read as a count and not as rows. */
export function useDeactivatedCustomerCount(): UseQueryResult<number> {
  return useQuery({
    queryKey: keys.customers.count(false),
    queryFn: () => services.people.countCustomers(false),
    staleTime: METRICS_STALE_MS,
  });
}

export interface SetCustomerActiveInput {
  readonly userId: number;
  readonly isActive: boolean;
}

/**
 * Switch an account on or off.
 *
 * The customer keeps every order they have placed either way — this decides
 * whether they can sign in and place another. The metrics tree is invalidated
 * with the directory because the "deactivated" tile counts the same rows.
 */
export function useSetCustomerActive(): UseMutationResult<
  UserRead,
  Error,
  SetCustomerActiveInput
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isActive }: SetCustomerActiveInput) =>
      services.people.setCustomerActive(userId, isActive),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.customers.all });
      void client.invalidateQueries({ queryKey: keys.metrics.all });
      void client.invalidateQueries({ queryKey: keys.reports.all });
    },
  });
}
