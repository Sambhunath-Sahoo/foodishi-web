"use client";

import * as React from "react";
import Link from "next/link";
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
import { useDeliveryNotes } from "../lib/delivery-notes";
import { AddressPicker } from "./address-picker";
import { DeliveryInstructionsField } from "./delivery-instructions-field";
import { CheckoutPaymentStep } from "./checkout-payment-step";
import { PaymentMethodPicker } from "./payment-method-picker";
import { QuoteSummary } from "./quote-summary";
import { VegMark } from "./dish-marks";
import { StickyActionBar } from "./sticky-action-bar";
import { useCart } from "../lib/cart";
import { useRestaurant } from "../lib/queries/catalog";
import { minimumOrderGap } from "../lib/minimum-order";
import { toQuoteRequest } from "../lib/quote-request";
import { usePlaceOrder, useQuote } from "../lib/queries/orders";
import {
  DEFAULT_PAYMENT_METHOD,
  isCashOnDelivery,
  paymentMethodLabel,
  type PaymentMethod,
} from "../lib/payment";
import { useAccount } from "../lib/use-account";
import { newIdempotencyKey } from "../lib/idempotency";
import {
  formatMinutes,
  formatMoney,
  formatMoneyShort,
  formatTimeOnly,
  withRupee,
} from "../lib/format";
import type { OrderDetail } from "../lib/types";

/** The order, once it exists, plus the one thing clearing the cart takes away. */
interface PlacedOrder {
  readonly order: OrderDetail;
  readonly kitchenName: string | null;
}

/**
 * Confirm, place, pay.
 *
 * The quote is re-run here rather than carried over from the cart: the
 * customer may have sat on this screen while the kitchen closed or a coupon
 * expired, and POST /orders would refuse a stale price anyway.
 *
 * Placing and paying are two calls, and this screen keeps them in that order
 * on purpose. POST /orders is what the customer came for; the authorization
 * against POST /orders/{id}/payments follows it and can be refused on its own,
 * so once the order exists the payment step owns the screen and says what
 * happened — see checkout-payment-step.tsx.
 */
export function CheckoutView(): React.JSX.Element {
  const { cart, isReady, setAddressId, clear } = useCart();
  // <RequireAccount> above this screen guarantees a signed-in, linked
  // customer, so `userId` is the profile id POST /orders is placed against.
  const { userId, isReady: isAccountReady } = useAccount();

  const request = React.useMemo(() => toQuoteRequest(cart), [cart]);
  const quote = useQuote(request, userId);
  const kitchen = useRestaurant(cart.restaurantId);
  const placeOrder = usePlaceOrder();
  const { draft, attachDraftToOrder } = useDeliveryNotes();

  const [method, setMethod] = React.useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD);
  /**
   * Set the moment POST /orders answers. The cart is spent by then — the order
   * carries the lines now — so it is cleared in the same breath, and the
   * kitchen name is kept here because clearing takes it with it.
   */
  const [placed, setPlaced] = React.useState<PlacedOrder | null>(null);

  /**
   * One UUID per attempt. It is minted on the client only — never during the
   * server render, which would hand every visitor the same key — and replaced
   * whenever the order body changes, because that is a different order. A
   * double-tap on a slow phone reuses it, so the server returns the original
   * order instead of creating a second one.
   */
  const attemptSignature = `${JSON.stringify(request)}|${userId ?? "none"}`;
  const [idempotencyKey, setIdempotencyKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIdempotencyKey(newIdempotencyKey());
  }, [attemptSignature]);

  const onSelectAddress = React.useCallback(
    (addressId: number | null) => setAddressId(addressId),
    [setAddressId],
  );

  if (placed !== null) {
    return (
      <CheckoutPaymentStep
        order={placed.order}
        kitchenName={placed.kitchenName}
        method={method}
      />
    );
  }

  if (!isReady || !isAccountReady) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-1/2" label="Loading your order" />
        <Skeleton className="h-40 w-full" label="Loading your order" />
      </div>
    );
  }

  if (cart.lines.length === 0 || cart.restaurantId === null) {
    return (
      <div className="flex flex-col gap-5">
        <PageTitle>Checkout</PageTitle>
        <EmptyState
          title="There is nothing to check out"
          detail="Add dishes to your cart and the address, the bill and the Place order button appear here."
          action={
            <Link href="/" className={cn(buttonVariants({ size: "lg" }), "w-auto no-underline")}>
              Find a kitchen
            </Link>
          }
        />
      </div>
    );
  }

  if (userId === null) {
    return (
      <div className="flex flex-col gap-5">
        <PageTitle subtitle={cart.restaurantName ?? undefined}>Checkout</PageTitle>
        <EmptyState
          title="Your profile is still loading"
          detail="An order is placed against your Foodishi profile, and GET /me has not answered yet. Give it a moment, or sign in again."
        />
      </div>
    );
  }

  const placingUserId = userId;

  function submit(): void {
    if (request === null || idempotencyKey === null) return;
    placeOrder.mutate(
      {
        userId: placingUserId,
        request,
        idempotencyKey,
        // Sent WITH the order now, not kept beside it. Until `delivery_note`
        // existed on OrderCreate this note never left the browser, so the
        // kitchen could not act on it and every "you didn't ring the bell"
        // complaint was unanswerable.
        deliveryNote: draft.trim() === "" ? null : draft.trim(),
      },
      {
        onSuccess: (order) => {
          // Still kept locally as well, and deliberately: it is what the
          // customer asked for at the time, and the tracking screen shows it
          // back to them even for orders placed before the field shipped.
          attachDraftToOrder(order.id);
          // Hand the screen to the payment step rather than to /orders/{id}:
          // the authorization has not been attempted yet, and a tracking
          // screen is the wrong place to learn that it was refused.
          setPlaced({ order, kitchenName: cart.restaurantName });
          clear();
        },
      },
    );
  }

  // isPlaceholderData is the whole point. The quote query keeps the PREVIOUS
  // answer on screen across a key change (`placeholderData: (previous) =>
  // previous`, lib/queries/orders.ts) so the panel does not collapse on every
  // quantity tick. But this gate never asked whether the data on screen belongs
  // to the request the tap is about to send -- so switching address, changing a
  // quantity or applying a coupon left a window where the sticky bar showed the
  // OLD total and the button was live. submit() sends the NEW cart, the server
  // prices the new address, and the customer is charged something they were
  // never shown. It is the one place in this app where that is possible.
  const isQuoteStale = quote.isPlaceholderData || quote.isFetching;
  const canPlace =
    request !== null &&
    idempotencyKey !== null &&
    quote.data !== undefined &&
    !quote.isError &&
    !isQuoteStale;
  /**
   * Why Place order is disabled, printed directly above it. The server's own
   * refusal used to sit in the bill ~1100px up the page while the button sat
   * grey under the thumb with nothing beside it.
   */
  const gap = minimumOrderGap(cart.lines, kitchen.data?.policy?.min_order_value);
  const blockedReason = canPlace
    ? null
    : cart.addressId === null
      ? "Choose a delivery address above to place the order."
      : gap !== null
        ? `Add ${formatMoneyShort(gap.shortBy)} more to order from ${cart.restaurantName ?? "this kitchen"} — the minimum is ${formatMoneyShort(gap.minimum)}.`
        : quote.isError
          ? withRupee(toUserMessage(quote.error))
          : "Updating the total for your latest changes…";
  const freeWindowMinutes =
    quote.data === undefined
      ? 0
      : Math.max(
          Math.round(
            (new Date(quote.data.cancellable_until).getTime() - Date.now()) / 60_000,
          ),
          0,
        );

  return (
    <div className="flex flex-col gap-5">
      <PageTitle subtitle={cart.restaurantName ?? undefined}>Checkout</PageTitle>

      <Card>
        <CardHeader>
          <CardTitle>Order</CardTitle>
          <Link
            href="/cart"
            className="-my-3 -mr-2 inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-[13px] font-medium text-accent no-underline"
          >
            Edit
          </Link>
        </CardHeader>
        <ul className="flex flex-col">
          {cart.lines.map((line) => (
            <li
              key={line.menuItemId}
              className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
            >
              <span className="flex min-w-0 items-center gap-2">
                <VegMark isVeg={line.isVeg} />
                <span className="min-w-0 truncate text-[13px] text-ink">
                  {line.name}
                </span>
              </span>
              <span className="shrink-0 text-[13px] tabular-nums text-ink-2">
                × {line.quantity}
              </span>
            </li>
          ))}
        </ul>
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
            returnPath="/checkout"
          />
        </CardBody>
      </Card>

      <DeliveryInstructionsField />

      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-2 py-3">
          <PaymentMethodPicker value={method} onChange={setMethod} />
          {/* Said before the tap, not after: the provider used here authorizes
              and nothing else. Capture arrives on a gateway callback this app
              cannot make, so an order is never marked paid on its own word. */}
          <p className="text-[13px] leading-snug text-ink-3">
            Placing the order authorizes the amount with the payment provider.
            Nothing is collected until the provider confirms it, and the order
            screen says which of the two has happened.
          </p>
        </CardBody>
      </Card>

      <QuoteSummary
        quote={quote.data}
        isPending={quote.isPending}
        isFetching={quote.isFetching}
        error={quote.error}
        onRetry={() => void quote.refetch()}
        waitingFor={
          cart.addressId === null
            ? "Choose a delivery address above — the fee and the promised time are both computed from it."
            : undefined
        }
      />

      {quote.data !== undefined ? (
        <Card
          stripe="cool"
          className={`px-4 py-3 ${isQuoteStale ? "opacity-60" : ""}`}
          aria-busy={isQuoteStale}
        >
          <p className="text-[13px] text-ink-2">
            Promised by{" "}
            <span className="font-mono tabular-nums text-ink">
              {formatTimeOnly(quote.data.promised_at)}
            </span>
            . Free to cancel for the first {formatMinutes(freeWindowMinutes)} after
            you place it; after that the kitchen keeps a cancellation fee.
          </p>
        </Card>
      ) : null}

      {placeOrder.isError ? (
        // The server's own refusal, verbatim — it names the thing to fix.
        <ErrorBanner
          title="Order not placed"
          message={toUserMessage(placeOrder.error)}
        />
      ) : null}

      <StickyActionBar label="Place the order">
        <div className="flex w-full flex-col gap-2">
          {/* The two facts the tap commits to — how much, and by what means —
              sit above the button rather than inside its label, which cannot
              wrap and must not push the page sideways at 390px. */}
          {quote.data !== undefined ? (
            // aria-busy and dimmed while the figure is a previous request's, so
            // the number and the button always agree about which cart they
            // describe. PriceBreakdown above already did this; the bar carrying
            // the number the tap commits to did not.
            <div
              className={`flex items-baseline justify-between gap-3 ${
                isQuoteStale ? "opacity-60" : ""
              }`}
              aria-busy={isQuoteStale}
            >
              <span className="text-[13px] text-ink-2">
                {paymentMethodLabel(method)}
              </span>
              <span className="text-[15px] font-semibold tabular-nums text-ink">
                {formatMoney(quote.data.total_amount)}
              </span>
            </div>
          ) : null}
          {blockedReason !== null && !placeOrder.isPending ? (
            <p
              id="checkout-blocked-reason"
              aria-live="polite"
              className="text-[13px] leading-snug text-ink-2"
            >
              {blockedReason}
              {gap !== null ? (
                <>
                  {" "}
                  <Link
                    href="/cart"
                    className="inline-flex min-h-11 items-center font-medium text-accent"
                  >
                    Back to your cart
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
          <Button
            block
            size="lg"
            // `lg` shrinks to its label from the sm breakpoint, which keys off
            // the browser, not this 480px column: on a desktop the bar's one
            // action collapsed to a small button in a wide bar.
            className="sm:w-full"
            aria-describedby={blockedReason === null ? undefined : "checkout-blocked-reason"}
            disabled={!canPlace}
            isPending={placeOrder.isPending}
            pendingLabel="Placing your order…"
            onClick={submit}
          >
            {isCashOnDelivery(method) ? "Place order — pay on delivery" : "Place order & pay"}
          </Button>
        </div>
      </StickyActionBar>
    </div>
  );
}
