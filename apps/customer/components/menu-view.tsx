"use client";

import * as React from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageTitle,
  Skeleton,
  Thumb,
  buttonVariants,
  cn,
} from "@repo/ui";
import { isNotFound } from "@repo/api-client";
import { LoadingLines, NotFoundState, QueryError } from "./data-states";
import { CartSwitchDialog } from "./cart-switch-dialog";
import { MenuItemRow } from "./menu-item-row";
import { MenuSectionBar, useActiveSection } from "./menu-section-bar";
import { StickyActionBar } from "./sticky-action-bar";
import { RatingBadge } from "./rating-badge";
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
  formatMoneyShort,
  formatPercent,
  isOpenNow,
  toNumber,
} from "../lib/format";
import { FIELD_TAP_TARGET } from "../lib/tap-targets";
import type { MenuCategory } from "../lib/types";

/** The section element's id for a category, which its chip scrolls to. */
function sectionId(category: MenuCategory): string {
  return `menu-section-${String(category.id)}`;
}

/**
 * The menu as the filters leave it. Categories the filters empty are dropped,
 * chips and all, so a "Veg only" menu never shows a Mutton section saying
 * "Nothing in this section today" — which is a different statement.
 */
function filterMenu(
  categories: readonly MenuCategory[],
  query: string,
  isVegOnly: boolean,
): readonly MenuCategory[] {
  const needle = query.trim().toLowerCase();
  if (needle === "" && !isVegOnly) return categories;
  return categories
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          (!isVegOnly || item.is_veg) &&
          (needle === "" ||
            item.name.toLowerCase().includes(needle) ||
            (item.description ?? "").toLowerCase().includes(needle)),
      ),
    }))
    .filter((category) => category.items.length > 0);
}

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

  /**
   * What the lines add up to at menu prices, for the bar's "1 item · ₹76".
   * A running tally, not the bill: tax, packaging and delivery only exist once
   * the quote prices an address, and the cart screen shows that figure.
   */
  const valueHere = React.useMemo(
    () =>
      cart.restaurantId === restaurantId
        ? cart.lines.reduce(
            (total, line) => total + toNumber(line.unitPrice) * line.quantity,
            0,
          )
        : 0,
    [cart.lines, cart.restaurantId, restaurantId],
  );

  const [query, setQuery] = React.useState("");
  const [isVegOnly, setIsVegOnly] = React.useState(false);
  const shownCategories = React.useMemo(
    () =>
      filterMenu(
        [...(menu.data ?? [])].sort((a, b) => a.sort_order - b.sort_order),
        query,
        isVegOnly,
      ),
    [menu.data, query, isVegOnly],
  );
  const sectionIds = shownCategories.map(sectionId);
  const activeSection = useActiveSection(sectionIds);
  const scrollToSection = React.useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
    return <KitchenNotFound />;
  }

  if (restaurant.isPending) return <MenuSkeleton />;

  if (restaurant.isError) {
    // A 404 is the link being wrong, not the network: the kitchen left, or the
    // id in the URL was never one. Retrying cannot fix that, so it gets the
    // not-found state and a way back instead of a red banner.
    if (isNotFound(restaurant.error)) return <KitchenNotFound />;
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
  const isFiltering = query.trim() !== "" || isVegOnly;

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
          <RatingBadge
            tone="accent"
            rating={detail.rating}
            ratingCount={detail.rating_count}
            showCount
          />
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
                {formatMoneyShort(policy.min_order_value)}
              </span>
              {policy.free_delivery_above !== null ? (
                <>
                  {" · free delivery above "}
                  <span className="tabular-nums text-ink">
                    {formatMoneyShort(policy.free_delivery_above)}
                  </span>
                </>
              ) : null}
            </p>
            <p className="mt-1 text-ink-3">
              Free cancellation for {policy.cancellation_window_mins} min after you
              order; after that {formatPercent(policy.cancellation_fee_percent)} of the order is
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

      {/* Search and the veg filter sit above the chips, not inside the sticky
          row: they are set once, and the docked row stays one line tall. */}
      <div className="flex items-center gap-2">
        <label htmlFor="menu-search" className="sr-only">
          Search this menu
        </label>
        <Input
          id="menu-search"
          type="search"
          value={query}
          placeholder={`Search ${detail.name}`}
          onChange={(event) => setQuery(event.target.value)}
          className={cn(FIELD_TAP_TARGET, "min-w-0 flex-1")}
        />
        <button
          type="button"
          aria-pressed={isVegOnly}
          onClick={() => setIsVegOnly((value) => !value)}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-card border px-3 text-[13px] font-medium transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            isVegOnly
              ? "border-ok bg-ok-soft text-ok"
              : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2",
          )}
        >
          {/* The box is ticked as well as tinted: pressed reads without colour. */}
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex size-4 items-center justify-center rounded-[3px] border text-[11px] leading-none",
              isVegOnly ? "border-ok bg-ok text-on-accent" : "border-line-2",
            )}
          >
            {isVegOnly ? "✓" : ""}
          </span>
          Veg only
        </button>
      </div>

      <MenuSectionBar
        sections={shownCategories.map((category) => ({
          id: sectionId(category),
          label: category.name,
          count: category.items.length,
        }))}
        activeId={activeSection}
        onSelect={scrollToSection}
      />

      <section aria-label="Menu" className="-mt-2 flex flex-col gap-4">
        {menu.isPending ? <LoadingLines count={6} label="Loading the menu" /> : null}

        {menu.isError ? (
          <QueryError
            title="Could not load the menu"
            error={menu.error}
            onRetry={() => void menu.refetch()}
          />
        ) : null}

        {menu.isSuccess && (menu.data ?? []).length === 0 ? (
          <EmptyState
            title="This kitchen has not published a menu yet"
            detail="Their categories and dishes — starters, biryanis, breads — would be listed here once they add them."
          />
        ) : null}

        {menu.isSuccess && isFiltering && shownCategories.length === 0 ? (
          <EmptyState
            title={
              query.trim() === ""
                ? "No vegetarian dishes here"
                : `Nothing on this menu matches “${query.trim()}”`
            }
            detail="Dishes that match your search and filter would be listed here, grouped by section."
            action={
              <Button
                variant="outline"
                className="h-11"
                onClick={() => {
                  setQuery("");
                  setIsVegOnly(false);
                }}
              >
                Show the whole menu
              </Button>
            }
          />
        ) : null}

        {shownCategories.map((category) => (
          // The id and scroll margin live on a plain section, not on the Card:
          // the Card clips its corners with overflow-hidden, and the margin is
          // what stops a tapped heading landing under the two sticky rows.
          <section
            key={category.id}
            id={sectionId(category)}
            aria-labelledby={`${sectionId(category)}-title`}
            className="scroll-mt-[calc(var(--app-header-h)+64px)]"
          >
            <Card className="overflow-hidden">
              <h2
                id={`${sectionId(category)}-title`}
                className="border-b border-line bg-surface-2 px-4 py-2.5 text-[13px] font-semibold tracking-wide text-ink-2 uppercase"
              >
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
          </section>
        ))}
      </section>

      <ReviewList
        restaurantId={detail.id}
        platformRating={detail.rating}
        platformRatingCount={detail.rating_count}
      />

      {itemsHere > 0 ? (
        <StickyActionBar label="Your cart">
          <div className="flex w-full items-center justify-between gap-3">
            <span className="min-w-0 text-[13px] text-ink-2">
              <span className="font-semibold tabular-nums text-ink">
                {itemsHere} {itemsHere === 1 ? "item" : "items"} ·{" "}
                {formatMoneyShort(valueHere)}
              </span>
              <span className="block truncate text-[12px] text-ink-3">
                from {detail.name}, before delivery and taxes
              </span>
            </span>
            <Link
              href="/cart"
              className={cn(buttonVariants({ size: "lg" }), "w-auto shrink-0 no-underline")}
            >
              View cart
            </Link>
          </div>
        </StickyActionBar>
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

/** Both ways a kitchen link can point at nothing: an unknown slug, or a 404. */
function KitchenNotFound(): React.JSX.Element {
  return (
    <NotFoundState
      title="This kitchen isn’t on Foodishi"
      detail="It may have stopped taking orders, or the link may be mistyped. The kitchens delivering tonight are on Discover."
      backHref="/"
      backLabel="Back to Discover"
    />
  );
}
