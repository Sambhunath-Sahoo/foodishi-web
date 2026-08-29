"use client";

import * as React from "react";
import { Button, ErrorBanner } from "@repo/ui";

/**
 * The route-level error boundary this app did not have.
 *
 * There was no error.tsx, global-error.tsx or not-found.tsx anywhere under
 * app/, so a throw during RENDER — as opposed to a rejected query, which is
 * handled well everywhere — replaced the entire ordering flow with Next's
 * unstyled default error page: no header, no tab bar, no route back to the cart,
 * and in production no message either.
 *
 * The throw sites are real: useCart() throws when the provider is missing,
 * getSupabaseConfig() throws by design when NEXT_PUBLIC_SUPABASE_URL is unset,
 * and any component reading a field off a response shape that has drifted throws
 * rather than degrading.
 *
 * `reset` re-renders the segment, which is the right first move for a transient
 * failure. The link out is absolute rather than router.back(), because the
 * history entry behind a crash is often the thing that crashed.
 */
export default function RouteError({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}): React.JSX.Element {
  React.useEffect(() => {
    // Server-side digests are all production gives you, so keep it findable.
    console.error("Route error", error.digest ?? "", error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4 py-6">
      <ErrorBanner
        title="Something went wrong on this screen"
        message="Your cart and your orders are safe. Try again, or head back to the menu."
        action={
          <Button size="sm" variant="ghost" onClick={reset}>
            Try again
          </Button>
        }
      />
      {/* A HARD navigation, not next/link. This boundary catches render throws,
          and if the thing that threw is the router or a provider then a client
          transition has nothing to transition with — a full document load is the
          one escape that always works. Hence a button rather than an anchor,
          which also keeps @next/next/no-html-link-for-pages happy. */}
      <Button
        size="sm"
        variant="ghost"
        className="self-start"
        onClick={() => {
          window.location.assign("/");
        }}
      >
        Back to restaurants
      </Button>
    </div>
  );
}
