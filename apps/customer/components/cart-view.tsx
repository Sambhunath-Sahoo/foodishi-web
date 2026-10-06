"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorBanner,
  PageTitle,
  Skeleton,
  buttonVariants,
  cn,
} from "@repo/ui";
import { toUserMessage } from "@repo/api-client";
import { AddressPicker } from "./address-picker";
import { CartLines } from "./cart-lines";
import { CouponField } from "./coupon-field";
import { QuoteSummary } from "./quote-summary";
import { StickyActionBar } from "./sticky-action-bar";
import { MinimumOrderGap } from "./minimum-order-gap";
import { useCart } from "../lib/cart";
import { useRestaurant } from "../lib/queries/catalog";
import { minimumOrderGap } from "../lib/minimum-order";
import { toQuoteRequest } from "../lib/quote-request";
import { useQuote } from "../lib/queries/orders";
import { useAccount } from "../lib/use-account";
import { toLoginHref } from "../lib/next-path";
import { formatMoney, withRupee } from "../lib/format";

/**
 * THE cart screen.
 *
 * Every change — a quantity, the address, the coupon — re-runs
 * POST /orders/quote and the panel below re-reads the server's answer. Nothing
 * on this page is added up in the browser. That is the whole reason the quote
 * endpoint exists: the price here is the price charged, because POST /orders
 * runs the same pricing service over the same body.
 */
export function CartView(): React.JSX.Element {
  const { cart, isReady, setQuantity, removeItem, setAddressId, setCouponCode, clear } =
    useCart();
  // Public screen: browsing and pricing work signed out. `userId` is null
  // until someone signs in, which only gates the address book and coupons.
  const { userId, isSignedIn, isReady: isAccountReady } = useAccount();

  // How many lines the reorder flow had to leave out. Number.parseInt over a
  // hostile string: junk becomes NaN, and NaN > 0 is false, so a bad parameter
  // renders nothing.
  const router = useRouter();
  const searchParams = useSearchParams();
  const droppedParam = Number.parseInt(searchParams.get("dropped") ?? "", 10);

  // Dismissable, and cleared from the URL once acknowledged. The parameter
  // otherwise survives every edit to the cart, so a customer who reorders, reads
  // the notice, then adds a dish keeps being told about a drop that no longer
  // describes what is on screen — and it would come back on every refresh.
  const [isDropNoticeDismissed, setIsDropNoticeDismissed] = React.useState(false);
  const droppedCount = isDropNoticeDismissed ? 0 : droppedParam;
  const dismissDropNotice = React.useCallback(() => {
    setIsDropNoticeDismissed(true);
    // replace, not push: this is not a step anybody should be able to go back to.
    router.replace("/cart");
  }, [router]);

  const request = React.useMemo(() => toQuoteRequest(cart), [cart]);
  const quote = useQuote(request, userId);
  const kitchen = useRestaurant(cart.restaurantId);
  const gap = minimumOrderGap(cart.lines, kitchen.data?.policy?.min_order_value);

  const onSelectAddress = React.useCallback(
    (addressId: number | null) => setAddressId(addressId),
    [setAddressId],
  );

  if (!isReady || !isAccountReady) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-1/2" label="Loading your cart" />
        <Skeleton className="h-40 w-full" label="Loading your cart" />
        <Skeleton className="h-32 w-full" label="Pricing your cart" />
      </div>
    );
  }

  if (cart.lines.length === 0 || cart.restaurantId === null) {
    return (
      <div className="flex flex-col gap-5">
        <PageTitle subtitle="Nothing in it yet">Your cart</PageTitle>
        <EmptyState
          title="Your cart is empty"
          detail="Dishes you add from a kitchen's menu land here — Hyderabadi Dum Biryani, Masala Dosa, Mirchi Ka Salan — with the live bill underneath them."
          action={
            <Link href="/" className={cn(buttonVariants({ size: "lg" }), "w-auto no-underline")}>
              Find a kitchen
            </Link>
          }
        />
      </div>
    );
  }

  const restaurantId = cart.restaurantId;
  const menuHref =
    cart.restaurantSlug === null
      ? `/r/${restaurantId}`
      : `/r/${restaurantId}-${cart.restaurantSlug}`;

  const waitingForAddress =
    cart.addressId === null
      ? isSignedIn
        ? "Choose a delivery address above. Distance, delivery fee and the promised time all come from it, so nothing can be priced until it is set."
        : "Sign in to pick a delivery address — the delivery fee, the distance and the promised time are all computed from it. Your cart stays exactly as it is."
      : undefined;

  const canCheckout =
    quote.data !== undefined && quote.isError === false && cart.addressId !== null;

  /**
   * Why Checkout is disabled, said beside it. A grey button with the reason
   * somewhere up the page — or under this very bar — is a dead end on a phone.
   * The minimum is handled above this, as its own state with a way forward.
   */
  const blockedReason =
    cart.addressId === null
      ? "Choose a delivery address to see the total."
      : quote.isError
        ? withRupee(toUserMessage(quote.error))
        : "Pricing your order…";

  return (
    <div className="flex flex-col gap-5">
      <PageTitle subtitle={cart.restaurantName ?? undefined}>Your cart</PageTitle>

      {/* Reorder promises, in its own words, that "whatever survives goes in the
          cart and the customer is told what did not, because silently dropping a
          line would show a total they never agreed to." It wrote the count to
          `?dropped=N` and NOTHING read it — so a reorder of four dishes with two
          delisted landed here showing two dishes, roughly half the expected
          total, and no explanation anywhere on the page. This is the telling. */}
      {droppedCount > 0 ? (
        <ErrorBanner
          tone="warn"
          title={
            droppedCount === 1
              ? "One dish is not on the menu today"
              : `${String(droppedCount)} dishes are not on the menu today`
          }
          message="They were left out of your cart, so this total is lower than your original order. Add anything else you want from the menu."
          action={
            <Button variant="ghost" size="sm" className="h-11" onClick={dismissDropNotice}>
              Got it
            </Button>
          }
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            <Link
              href={menuHref}
              className="inline-flex min-h-11 items-center text-accent no-underline"
            >
              {cart.restaurantName ?? "This kitchen"}
            </Link>
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-11" onClick={clear}>
            Empty cart
          </Button>
        </CardHeader>
        <CartLines
          lines={cart.lines}
          onSetQuantity={setQuantity}
          onRemove={removeItem}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deliver to</CardTitle>
        </CardHeader>
        <CardBody className="py-3">
          <AddressPicker
            userId={userId}
            selectedId={cart.addressId}
            onSelect={onSelectAddress}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coupon</CardTitle>
        </CardHeader>
        <CardBody className="py-3">
          <CouponField
            appliedCode={cart.couponCode}
            restaurantId={restaurantId}
            userId={userId}
            subtotal={quote.data?.subtotal ?? "0"}
            quoteMessage={quote.data?.coupon_message}
            discountAmount={quote.data?.discount_amount}
            onApply={setCouponCode}
            onRemove={() => setCouponCode(null)}
          />
        </CardBody>
      </Card>

      <QuoteSummary
        quote={quote.data}
        isPending={quote.isPending}
        isFetching={quote.isFetching}
        error={quote.error}
        onRetry={() => void quote.refetch()}
        waitingFor={waitingForAddress}
      />

      {/* Thumb-reachable, above the tab bar, showing the server's total. */}
      <StickyActionBar label="Your cart">
        {gap !== null ? (
          // Under the minimum, the quote refuses and there is no total to show.
          // The bar says what would fix it and offers the fix, instead of a
          // "To pay —" beside a grey Checkout with no reason.
          <MinimumOrderGap
            gap={gap}
            kitchenName={cart.restaurantName ?? "this kitchen"}
            menuHref={menuHref}
          />
        ) : (
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-[11px] text-ink-3">To pay</span>
              <span className="text-base font-semibold tabular-nums text-ink">
                {quote.data === undefined ? "—" : formatMoney(quote.data.total_amount)}
              </span>
            </div>
            {/* Signed out, the button is still live: it goes to /login carrying
                ?next=/checkout, and the cart is in localStorage, so signing in
                lands back on checkout with every line still there. */}
            {!isSignedIn ? (
              <Link
                href={toLoginHref("/checkout")}
                className={cn(buttonVariants({ size: "lg" }), "w-auto no-underline")}
              >
                Sign in to check out
              </Link>
            ) : canCheckout ? (
              <Link
                href="/checkout"
                className={cn(buttonVariants({ size: "lg" }), "w-auto no-underline")}
              >
                Checkout
              </Link>
            ) : (
              <div className="flex min-w-0 flex-col items-end gap-1">
                <Button
                  size="lg"
                  className="w-auto"
                  disabled
                  aria-describedby="cart-blocked-reason"
                >
                  Checkout
                </Button>
                <p
                  id="cart-blocked-reason"
                  className="text-right text-[12px] leading-snug text-ink-2"
                >
                  {blockedReason}
                </p>
              </div>
            )}
          </div>
        )}
      </StickyActionBar>
    </div>
  );
}
