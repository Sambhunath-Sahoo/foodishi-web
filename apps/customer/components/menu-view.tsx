"use client";

import * as React from "react";
import Link from "next/link";
import {
  Badge,
  Card,
  EmptyState,
  PageTitle,
  Skeleton,
  Thumb,
  buttonVariants,
  cn,
} from "@repo/ui";
import { LoadingLines, QueryError } from "./data-states";
import { CartSwitchDialog } from "./cart-switch-dialog";
import { MenuItemRow } from "./menu-item-row";
import { ReviewList } from "./review-list";
import {
  menuItemHref,
  parseRestaurantRef,
  useMenu,
  useRestaurant,
  useRestaurantIdBySlug,
} from "../lib/queries/catalog";
import { useAddToCart } from "../lib/use-add-to-cart";
import { useCart, type CartRestaurant } from "../lib/cart";
import {
  formatClock,
  formatMoney,
  formatMoneyShort,
  formatRating,
  isOpenNow,
} from "../lib/format";

/**
 * A kitchen's menu, grouped by category in the order the kitchen set.
 *
 * A cart can hold one restaurant at a time — QuoteRequest carries a single
 * restaurant_id — so adding from a second kitchen asks first, with the name of
 * what would be lost.
 */
export function MenuView({ param }: { readonly param: string }): React.JSX.Element {
  const ref = React.useMemo(() => parseRestaurantRef(param), [param]);
  const bySlug = useRestaurantIdBySlug(ref.slug, ref.id === null);
  const restaurantId = ref.id ?? bySlug.data ?? null;

  const restaurant = useRestaurant(restaurantId);
  const menu = useMenu(restaurantId);
  const { cart, setQuantity } = useCart();

  const quantities = React.useMemo(() => {
    if (cart.restaurantId !== restaurantId) return new Map<number, number>();
    return new Map(cart.lines.map((line) => [line.menuItemId, line.quantity]));
  }, [cart.lines, cart.restaurantId, restaurantId]);

  const itemsHere = React.useMemo(
    () =>
      cart.restaurantId === restaurantId
        ? cart.lines.reduce((total, line) => total + line.quantity, 0)
        : 0,
    [cart.lines, cart.restaurantId, restaurantId],
  );

  // Memoised because useAddToCart closes over it: a fresh object every render
  // would rebuild its `add` callback on every keystroke elsewhere on the page.
  const asCartRestaurant = React.useMemo<CartRestaurant | null>(
    () =>
      restaurant.data === undefined
        ? null
        : {
            id: restaurant.data.id,
            name: restaurant.data.name,
            slug: restaurant.data.slug,
          },
    [restaurant.data],
  );

  // The one-kitchen confirm is shared with the dish screen — see useAddToCart.
  const { add, pendingSwitch, confirmSwitch, cancelSwitch } =
    useAddToCart(asCartRestaurant);

  if (bySlug.isPending && ref.id === null) {
    return <MenuSkeleton />;
  }

  if (restaurantId === null) {
    return (
      <EmptyState
        title="No kitchen at this address"
        detail={`Nothing matches "${param}". The kitchen may have closed, or the link may be mistyped.`}
        action={
          <Link href="/" className="text-sm font-medium text-accent">
            Back to tonight&apos;s kitchens
          </Link>
        }
      />
    );
  }

  if (restaurant.isPending) return <MenuSkeleton />;

  if (restaurant.isError) {
    return (
      <QueryError
        title="Could not load this kitchen"
        error={restaurant.error}
        onRetry={() => void restaurant.refetch()}
      />
    );
  }

  const detail = restaurant.data;
  const isOpen = isOpenNow(detail.opens_at, detail.closes_at) && detail.is_active;
  const policy = detail.policy;
  const categories = [...(menu.data ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        {/* The kitchen's own photo leads its page. 72px rather than a full-width
            hero: this screen is a menu, and the dishes below are what the
            person came to look at. */}
        <div className="flex items-start gap-3">
          <Thumb src={detail.image_url} name={detail.name} size={72} />
          <div className="min-w-0 flex-1">
            <PageTitle subtitle={`${detail.area} · ${detail.city}`}>
              {detail.name}
            </PageTitle>
          </div>
        </div>

        {detail.description !== null && detail.description !== "" ? (
          <p className="text-[13px] leading-snug text-ink-2">{detail.description}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={isOpen ? "ok" : "mute"}>
            {isOpen ? "Open now" : "Closed"}
          </Badge>
          <Badge tone="accent" dot={false}>
            ★ {formatRating(detail.rating)} · {detail.rating_count.toLocaleString()}
          </Badge>
          {detail.cuisines.map((cuisine) => (
            <Badge key={cuisine.id} tone="mute" dot={false}>
              {cuisine.name}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
          <span className="tabular-nums">
            {formatMoneyShort(detail.price_for_two)} for two
          </span>
          <span aria-hidden="true" className="text-ink-4">·</span>
          <span className="tabular-nums">{detail.avg_prep_minutes} min prep</span>
          <span aria-hidden="true" className="text-ink-4">·</span>
          <span className="font-mono text-[12px] tabular-nums text-ink-3">
            {formatClock(detail.opens_at)}–{formatClock(detail.closes_at)}
          </span>
        </div>

        {policy !== null && policy !== undefined ? (
          <Card className="px-4 py-3 text-[13px] text-ink-2">
            <p>
              Minimum order{" "}
              <span className="tabular-nums text-ink">
                {formatMoney(policy.min_order_value)}
              </span>
              {policy.free_delivery_above !== null ? (
                <>
                  {" · free delivery above "}
                  <span className="tabular-nums text-ink">
                    {formatMoney(policy.free_delivery_above)}
                  </span>
                </>
              ) : null}
            </p>
            <p className="mt-1 text-ink-3">
              Free cancellation for {policy.cancellation_window_mins} min after you
              order; after that {policy.cancellation_fee_percent}% of the order is
              kept as a fee.
            </p>
          </Card>
        ) : null}
      </header>

      {!isOpen ? (
        <Card stripe="warn" className="px-4 py-3">
          <p className="text-[13px] text-ink-2">
            {detail.name} is closed right now. You can build the order, but the
            quote will refuse it until they reopen at{" "}
            <span className="font-mono tabular-nums">
              {formatClock(detail.opens_at)}
            </span>
            .
          </p>
        </Card>
      ) : null}

      <section aria-label="Menu" className="flex flex-col gap-4">
        {menu.isPending ? <LoadingLines count={6} label="Loading the menu" /> : null}

        {menu.isError ? (
          <QueryError
            title="Could not load the menu"
            error={menu.error}
            onRetry={() => void menu.refetch()}
          />
        ) : null}

        {menu.isSuccess && categories.length === 0 ? (
          <EmptyState
            title="This kitchen has not published a menu yet"
            detail="Their categories and dishes — starters, biryanis, breads — would be listed here once they add them."
          />
        ) : null}

        {categories.map((category) => (
          <Card key={category.id} className="overflow-hidden">
            <h2 className="border-b border-line bg-surface-2 px-4 py-2.5 text-[13px] font-semibold tracking-wide text-ink-2 uppercase">
              {category.name}
              <span className="ml-2 font-normal tabular-nums text-ink-3">
                {category.items.length}
              </span>
            </h2>
            {category.items.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-ink-3">
                Nothing in this section today.
              </p>
            ) : (
              <ul className="flex flex-col">
                {category.items.map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    href={menuItemHref(detail, item.id)}
                    restaurant={{
                      id: detail.id,
                      name: detail.name,
                      slug: detail.slug,
                    }}
                    quantity={quantities.get(item.id) ?? 0}
                    onAdd={() => add(item)}
                    onSetQuantity={(next) => setQuantity(item.id, next)}
                  />
                ))}
              </ul>
            )}
          </Card>
        ))}
      </section>

      <ReviewList
        restaurantId={detail.id}
        platformRating={detail.rating}
        platformRatingCount={detail.rating_count}
      />

      {itemsHere > 0 ? (
        <div
          className={cn(
            "fixed inset-x-0 bottom-[56px] z-20 border-t border-line bg-surface",
            "px-4 py-3 shadow-card",
          )}
        >
          <div className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-3">
            <span className="text-[13px] text-ink-2">
              <span className="font-semibold tabular-nums text-ink">{itemsHere}</span>{" "}
              {itemsHere === 1 ? "item" : "items"} from {detail.name}
            </span>
            <Link
              href="/cart"
              className={cn(buttonVariants({ size: "md" }), "no-underline")}
            >
              View cart
            </Link>
          </div>
        </div>
      ) : null}

      <CartSwitchDialog
        pending={pendingSwitch}
        currentKitchenName={cart.restaurantName}
        currentLineCount={cart.lines.length}
        onCancel={cancelSwitch}
        onConfirm={confirmSwitch}
      />
    </div>
  );
}

function MenuSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-9 w-2/3" label="Loading the kitchen" />
      <Skeleton className="h-5 w-1/2" label="Loading the kitchen" />
      <LoadingLines count={6} label="Loading the menu" />
    </div>
  );
}
