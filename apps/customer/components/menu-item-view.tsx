"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Button, Card, PageTitle, Skeleton, cn } from "@repo/ui";
import { QueryError } from "./data-states";
import { CartSwitchDialog } from "./cart-switch-dialog";
import { SpiceMeter, VegMark } from "./dish-marks";
import { QuantityStepper } from "./quantity-stepper";
import {
  useMenuItem,
  useMenuItemImages,
  useRestaurant,
} from "../lib/queries/catalog";
import { useAddToCart } from "../lib/use-add-to-cart";
import { MAX_QUANTITY, useCart, type CartRestaurant } from "../lib/cart";
import { formatClock, formatMoney, formatMoneyShort, isOpenNow } from "../lib/format";
import type { MenuItemImage } from "../lib/types";

/**
 * One dish, on its own screen.
 *
 * A ROUTE, NOT A DIALOG, and the phone is the reason. At 390px anything holding
 * a photo, a description and an Add control fills the viewport anyway, so a
 * sheet would be a full screen wearing a dialog's costume — while giving up
 * three things a route keeps:
 *
 *  1. Back means "back to the menu". A <Dialog> is not in the history stack, so
 *     the gesture or hardware Back that every Android user reaches for first
 *     would leave the kitchen entirely and lose their place in a long menu.
 *  2. A dish is shareable. "Order this" is a link someone sends, and it has to
 *     open cold — which is why useMenuItem reads by id instead of expecting the
 *     menu to be in the cache.
 *  3. The menu keeps its scroll position underneath, restored by the router
 *     rather than by us remembering an offset.
 *
 * The cost is one extra request for a dish already listed on the previous
 * screen. Worth it: the gallery is a second request either way, and it is the
 * only thing here the menu row did not already know.
 */
export function MenuItemView({
  restaurantParam,
  itemParam,
}: {
  /** The `{id}-{slug}` segment, used for the back link before the kitchen loads. */
  readonly restaurantParam: string;
  readonly itemParam: string;
}): React.JSX.Element {
  const isValidId = /^\d+$/.test(itemParam);
  const itemId = isValidId ? Number.parseInt(itemParam, 10) : null;

  const item = useMenuItem(itemId);
  const images = useMenuItemImages(itemId);

  // The dish names its own kitchen, so the URL's slug never has to be trusted:
  // a mistyped or renamed slug still lands on the right menu and the right cart.
  const restaurantId = item.data?.restaurant_id ?? null;
  const restaurant = useRestaurant(restaurantId);

  const { cart, setQuantity } = useCart();
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
  const { add, pendingSwitch, confirmSwitch, cancelSwitch } =
    useAddToCart(asCartRestaurant);

  const quantity =
    cart.restaurantId === restaurantId
      ? (cart.lines.find((line) => line.menuItemId === itemId)?.quantity ?? 0)
      : 0;

  const backHref =
    restaurant.data === undefined
      ? `/r/${restaurantParam}`
      : `/r/${restaurant.data.id}-${restaurant.data.slug}`;

  if (!isValidId) {
    return (
      <QueryError
        title="That is not a dish"
        error={
          new Error(
            `"${itemParam}" is not a dish id. Open the dish from a kitchen's menu instead.`,
          )
        }
      />
    );
  }

  if (item.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="aspect-[4/3] w-full" label="Loading the dish" />
        <Skeleton className="h-9 w-2/3" label="Loading the dish" />
        <Skeleton className="h-5 w-1/2" label="Loading the dish" />
      </div>
    );
  }

  if (item.isError) {
    // A 404 here says which dish, in the server's own words — the kitchen may
    // simply have taken it off the menu since the link was shared.
    return (
      <div className="flex flex-col gap-4">
        <QueryError
          title="Could not load this dish"
          error={item.error}
          onRetry={() => void item.refetch()}
        />
        <Link href={backHref} className="text-sm font-medium text-accent">
          Back to the menu
        </Link>
      </div>
    );
  }

  const dish = item.data;
  const photos = toPhotos(images.data, dish.image_url);
  const isUnavailable = !dish.is_available;
  const kitchen = restaurant.data;
  const isKitchenOpen =
    kitchen === undefined ||
    (isOpenNow(kitchen.opens_at, kitchen.closes_at) && kitchen.is_active);

  return (
    <div className="flex flex-col gap-5 pb-6">
      <Link
        href={backHref}
        className="self-start text-[13px] font-medium text-accent no-underline"
      >
        ← {kitchen?.name ?? "Back to the menu"}
      </Link>

      <DishGallery photos={photos} name={dish.name} />

      <header className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <span className="mt-2.5">
            <VegMark isVeg={dish.is_veg} />
          </span>
          <div className="min-w-0 flex-1">
            <PageTitle>{dish.name}</PageTitle>
          </div>
        </div>

        <p className="text-lg tabular-nums text-ink">{formatMoney(dish.price)}</p>

        {dish.description !== null && dish.description !== "" ? (
          <p className="text-sm leading-relaxed text-ink-2">{dish.description}</p>
        ) : (
          <p className="text-[13px] text-ink-3">
            {kitchen?.name ?? "This kitchen"} has not written a description for
            this dish.
          </p>
        )}
      </header>

      <Card className="flex flex-col gap-2.5 px-4 py-3.5">
        <h2 className="text-[13px] font-semibold tracking-wide text-ink-2 uppercase">
          On the plate
        </h2>
        <dl className="flex flex-col gap-2 text-[13px]">
          {/* The word only: the mark beside the title already carries the
              glyph, and repeating it here makes a screen reader say the diet
              twice in a row. */}
          <Fact label="Diet">{dish.is_veg ? "Vegetarian" : "Non-vegetarian"}</Fact>
          <Fact label="Spice">
            {/* SpiceMeter renders nothing for an unspiced dish, which would
                leave the row blank — so say so in words instead. */}
            {dish.spice_level === "none" ? (
              "Not spiced"
            ) : (
              <SpiceMeter level={dish.spice_level} />
            )}
          </Fact>
          <Fact label="Serves">
            <span className="tabular-nums">
              {dish.serves} {dish.serves === 1 ? "person" : "people"}
            </span>
          </Fact>
          <Fact label="Calories">
            {dish.calories === null ? (
              <span className="text-ink-3">Not published for this dish</span>
            ) : (
              <span className="tabular-nums">{dish.calories} kcal</span>
            )}
          </Fact>
        </dl>
      </Card>

      {images.isError ? (
        <QueryError
          title="Could not load this dish's photos"
          error={images.error}
          onRetry={() => void images.refetch()}
        />
      ) : null}

      {isUnavailable ? (
        <Card stripe="mute" className="px-4 py-3">
          <p className="text-[13px] text-ink-2">
            <strong className="font-semibold">Off the menu today.</strong>{" "}
            {kitchen?.name ?? "The kitchen"} has paused this dish, so it cannot
            be added. The rest of the menu is still open.
          </p>
        </Card>
      ) : null}

      {!isKitchenOpen && kitchen !== undefined ? (
        <Card stripe="warn" className="px-4 py-3">
          <p className="text-[13px] text-ink-2">
            {kitchen.name} is closed right now. You can add this dish, but the
            quote will refuse the order until they reopen at{" "}
            <span className="font-mono tabular-nums">
              {formatClock(kitchen.opens_at)}
            </span>
            .
          </p>
        </Card>
      ) : null}

      {/* Sits above the tab bar, the same place the menu's cart bar sits, so the
          Add control is under the thumb rather than wherever the page scrolled
          to. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[56px] z-20 border-t border-line bg-surface",
          "px-4 py-3 shadow-card",
        )}
      >
        <div className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold tabular-nums text-ink">
              {formatMoney(dish.price)}
            </p>
            <p className="truncate text-[12px] text-ink-3">
              {quantity > 0
                ? `${quantity} in your cart`
                : `Adds to your order from ${kitchen?.name ?? "this kitchen"}`}
            </p>
          </div>

          {isUnavailable ? (
            <Badge tone="mute">Off the menu today</Badge>
          ) : quantity > 0 ? (
            <QuantityStepper
              quantity={quantity}
              itemName={dish.name}
              max={MAX_QUANTITY}
              onChange={(next) => setQuantity(dish.id, next)}
            />
          ) : (
            <Button
              size="md"
              disabled={asCartRestaurant === null}
              onClick={() => add(dish)}
            >
              Add · {formatMoneyShort(dish.price)}
            </Button>
          )}
        </div>
      </div>

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

interface DishPhoto {
  readonly url: string;
  /** The manager's own alt text, or null when there is none. */
  readonly alt: string | null;
}

/**
 * The gallery if there is one, otherwise the cover the menu row already had.
 * `MenuItemRead.image_url` is derived from position 0 of the same table, so the
 * two agree — the fallback only matters if the gallery read failed.
 */
function toPhotos(
  images: readonly MenuItemImage[] | undefined,
  coverUrl: string | null | undefined,
): readonly DishPhoto[] {
  if (images !== undefined && images.length > 0) {
    return images.map((image) => ({ url: image.url, alt: image.alt_text }));
  }
  if (typeof coverUrl === "string" && coverUrl !== "") {
    return [{ url: coverUrl, alt: null }];
  }
  return [];
}

function Fact({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}

/**
 * A horizontal snap-scroller rather than a grid: at 390px only one photo of a
 * dish is worth looking at at a time, and a native scroller needs no state, no
 * arrows and no keyboard trap. Wide content scrolling inside its own container
 * is also the only way the body never scrolls sideways (DESIGN.md #4).
 */
function DishGallery({
  photos,
  name,
}: {
  readonly photos: readonly DishPhoto[];
  readonly name: string;
}): React.JSX.Element {
  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-card border border-line bg-surface-2 px-8">
        <p className="text-center text-[13px] text-ink-3">
          No photo of {name} yet — the kitchen’s photos of it would appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* A tab stop only when there is something to scroll: a scrollable region
          keyboard users cannot focus is a region they cannot pan. */}
      <div
        role="group"
        aria-label={`Photos of ${name}`}
        tabIndex={photos.length > 1 ? 0 : undefined}
        className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {photos.map((photo) => (
          <DishImage key={photo.url} photo={photo} name={name} />
        ))}
      </div>
      {photos.length > 1 ? (
        <p className="text-[12px] text-ink-3">
          <span className="tabular-nums">{photos.length}</span> photos — swipe to
          see the rest.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Not <Thumb>: that reserves a fixed square box in pixels, which is right for a
 * list row and wrong for a photo that should be as wide as the phone. The
 * fallback discipline is the same though — a URL that 404s after render leaves a
 * caption, never a broken-image glyph.
 */
function DishImage({
  photo,
  name,
}: {
  readonly photo: DishPhoto;
  readonly name: string;
}): React.JSX.Element {
  const [hasFailed, setHasFailed] = React.useState(false);
  const box =
    "aspect-[4/3] w-full shrink-0 snap-center overflow-hidden rounded-card border border-line bg-surface-2";

  if (hasFailed) {
    return (
      <div className={cn(box, "flex items-center justify-center px-8")}>
        <p className="text-center text-[13px] text-ink-3">
          This photo of {name} could not be loaded.
        </p>
      </div>
    );
  }

  const hasAlt = photo.alt !== null && photo.alt !== "";
  return (
    /* next/image is not an option in this monorepo: it needs sharp plus an
       images.remotePatterns entry in all three apps to re-optimise Supabase
       objects that are already sized. <Thumb> makes the same trade for the
       same reason. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.url}
      // The dish is named in the heading below, so a photo with no alt text of
      // its own is decorative rather than described twice.
      alt={hasAlt ? (photo.alt ?? "") : ""}
      aria-hidden={hasAlt ? undefined : "true"}
      loading="lazy"
      decoding="async"
      onError={() => setHasFailed(true)}
      className={cn(box, "object-cover")}
    />
  );
}
