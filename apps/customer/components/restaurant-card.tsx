"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@repo/ui";
import { FavoriteButton } from "./favorite-button";
import { useFavorites } from "../lib/favorites";
import { RatingBadge } from "./rating-badge";
import { formatClock, formatMoneyShort, isOpenNow } from "../lib/format";
import { restaurantHref } from "../lib/queries/catalog";
import type { RestaurantSummary } from "../lib/types";

/**
 * A kitchen in the Discover grid: photo first, because a food app is browsed by
 * appetite, then one line each for who, where and what it costs.
 *
 * Every card has the same three text rows whatever the data, so cards in a
 * grid row share baselines and the grid never shows a ragged bottom edge.
 */
export function RestaurantCard({
  restaurant,
  isPureVeg = false,
}: {
  readonly restaurant: RestaurantSummary;
  readonly isPureVeg?: boolean;
}): React.JSX.Element {
  const isOpen = isOpenNow(restaurant.opens_at, restaurant.closes_at);
  const { isRestaurantSaved, toggleRestaurant } = useFavorites();

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-[border-color,box-shadow] hover:border-line-2">
      {/* Sibling of the link, not a child: a <button> inside an <a> is invalid
          and screen readers announce the pair unpredictably. 36px drawn, but
          the ::before pad makes the hit area 44px on every pointer — centred
          on the disc by 50% + translate, the same build as the Discover chips
          (filter-chips.tsx, HIT_PAD), not by a -5px that silently assumed the
          1px border. */}
      <div className="absolute right-2.5 top-2.5 z-10">
        <FavoriteButton
          size="sm"
          isSaved={isRestaurantSaved(restaurant.id)}
          subject={restaurant.name}
          onToggle={() => toggleRestaurant(restaurant)}
          className={cn(
            "relative h-9 w-9 border-transparent shadow-card",
            "before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-1/2 before:content-['']",
            isRestaurantSaved(restaurant.id) ? "bg-surface" : "bg-surface/90 text-ink-2",
          )}
        />
      </div>

      <Link
        href={restaurantHref(restaurant)}
        className="flex flex-1 flex-col no-underline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
      >
        <KitchenCover
          src={restaurant.image_url}
          name={restaurant.name}
          isOpen={isOpen}
          isPureVeg={isPureVeg}
        />

        <div className="flex flex-1 flex-col gap-1 px-3.5 pt-3 pb-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-[15px] font-semibold leading-snug text-ink">
              {restaurant.name}
            </h2>
            <RatingBadge
              rating={restaurant.rating}
              ratingCount={restaurant.rating_count}
            />
          </div>
          <p className="truncate text-[13px] text-ink-3">
            {restaurant.area} · {restaurant.city}
          </p>
          <MetaLine restaurant={restaurant} isOpen={isOpen} />
        </div>
      </Link>
    </article>
  );
}

/**
 * Price, prep time and open state on one line. The open state carries a dot
 * and words, never colour alone (DESIGN.md #3). It truncates rather than
 * wrapping so every card keeps the same height.
 */
function MetaLine({
  restaurant,
  isOpen,
}: {
  readonly restaurant: RestaurantSummary;
  readonly isOpen: boolean;
}): React.JSX.Element {
  const openState = isOpen
    ? `Open till ${formatClock(restaurant.closes_at)}`
    : `Closed · opens ${formatClock(restaurant.opens_at)}`;

  return (
    <p className="mt-1 flex min-w-0 items-center gap-2 text-[13px] text-ink-2">
      <span className="shrink-0 tabular-nums">
        {formatMoneyShort(restaurant.price_for_two)} for two
      </span>
      <Separator />
      <span className="shrink-0 tabular-nums">
        {restaurant.avg_prep_minutes} min
      </span>
      <Separator />
      <span
        className={cn(
          "flex min-w-0 items-center gap-1.5",
          isOpen ? "text-ok" : "text-ink-3",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 shrink-0 rounded-chip",
            isOpen ? "bg-ok" : "bg-mute",
          )}
        />
        <span className="truncate">{openState}</span>
      </span>
    </p>
  );
}

function Separator(): React.JSX.Element {
  return (
    <span aria-hidden="true" className="shrink-0 text-ink-4">
      ·
    </span>
  );
}

/** "Ambur Star Biryani" -> "AS". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * The cover photo at 16:10. The box is sized by aspect ratio, not by the
 * image, so a missing or broken photo leaves the same footprint: initials on a
 * token ground rather than a hole in the grid. A closed kitchen's photo is
 * dimmed — the meta line says "Closed" in words, the dimming only echoes it.
 */
function KitchenCover({
  src,
  name,
  isOpen,
  isPureVeg,
}: {
  readonly src?: string | null;
  readonly name: string;
  readonly isOpen: boolean;
  readonly isPureVeg: boolean;
}): React.JSX.Element {
  const [hasFailed, setHasFailed] = React.useState(false);
  const showPhoto = typeof src === "string" && src !== "" && !hasFailed;

  // A re-sorted grid reuses elements; a stale error must not stick to the
  // next kitchen's photo.
  React.useEffect(() => {
    setHasFailed(false);
  }, [src]);

  return (
    <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-surface-2">
      {showPhoto ? (
        // A plain <img> for the reason Thumb gives (packages/ui thumb.tsx):
        // every URL is an already-sized Supabase object, and next/image would
        // need sharp plus a remotePatterns block to re-optimise it. Thumb itself
        // cannot be used: it pins a square px box, and this is a 16:10 cover.
        // eslint-disable-next-line @next/next/no-img-element -- see above
        <img
          src={src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setHasFailed(true)}
          className={cn(
            "size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]",
            !isOpen && "opacity-60 grayscale-[40%]",
          )}
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-full items-center justify-center font-sans text-3xl font-semibold text-ink-4 select-none"
        >
          {initials(name)}
        </span>
      )}
      {isPureVeg ? (
        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-chip bg-surface px-2 py-0.5 text-[12px] font-medium text-ok shadow-card">
          <span aria-hidden="true" className="size-1.5 rounded-chip bg-ok" />
          Pure veg
        </span>
      ) : null}
    </div>
  );
}
