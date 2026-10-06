"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** The query parameter that names the order whose drawer is open. */
export const ORDER_PARAM = "order";

export interface OpenOrder {
  /** The order in the drawer, or null when it is closed. */
  readonly orderId: number | null;
  readonly open: (orderId: number) => void;
  readonly close: () => void;
}

/** A positive integer id, or null for anything else a URL might carry. */
function parseOrderId(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * The open order drawer, kept in the URL as `?order=<id>`.
 *
 * It used to be component state, so an open order had no address (OP-4): a
 * support agent could not paste "#716" to a colleague, a reload threw the
 * drawer away mid-call, and the back button left the page instead of closing
 * it. Every page that hosts `OrderDrawer` reads it from here so the parameter
 * means the same thing on all of them.
 *
 * `replace`, not `push`: opening five orders in a row should not cost five
 * presses of Back to leave the page. `scroll: false` because the board behind
 * the drawer must not jump to the top. Every other parameter on the URL is
 * carried over untouched.
 *
 * Reads `useSearchParams`, so the caller has to sit under a Suspense boundary
 * for the route to prerender — `app/(console)/layout.tsx` provides one.
 */
export function useOpenOrder(): OpenOrder {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orderId = parseOrderId(searchParams.get(ORDER_PARAM));

  const write = React.useCallback(
    (next: number | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === null) params.delete(ORDER_PARAM);
      else params.set(ORDER_PARAM, String(next));
      const query = params.toString();
      router.replace(query === "" ? pathname : `${pathname}?${query}`, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const open = React.useCallback((next: number) => write(next), [write]);
  const close = React.useCallback(() => write(null), [write]);

  return { orderId, open, close };
}
