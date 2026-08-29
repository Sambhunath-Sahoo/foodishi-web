import * as React from "react";
import { Skeleton } from "@repo/ui";
import { CartView } from "../../components/cart-view";

/**
 * CartView reads `?dropped=N` — the count of dishes a reorder had to leave out —
 * so it calls useSearchParams, and a client component that does cannot be
 * statically prerendered without a Suspense boundary above it. Without this the
 * build fails outright on "Error occurred prerendering page /cart".
 *
 * The fallback matches CartView's own not-ready skeleton, so the boundary is
 * invisible: this page was static before and stays static.
 */
export default function CartPage(): React.JSX.Element {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-1/2" label="Loading your cart" />
          <Skeleton className="h-32 w-full" />
        </div>
      }
    >
      <CartView />
    </React.Suspense>
  );
}
