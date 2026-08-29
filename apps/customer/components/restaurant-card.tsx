"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Card, Thumb, cn } from "@repo/ui";
import { FavoriteButton } from "./favorite-button";
import { useFavorites } from "../lib/favorites";
import {
  formatClock,
  formatMoneyShort,
  formatRating,
  isOpenNow,
} from "../lib/format";
import { restaurantHref } from "../lib/queries/catalog";
import type { RestaurantSummary } from "../lib/types";

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
    <Card className={cn("relative", !isOpen && "opacity-75")}>
      {/* Sibling of the link, not a child: a <button> inside an <a> is invalid
          and screen readers announce the pair unpredictably. */}
      <div className="absolute right-3 top-3 z-10">
        <FavoriteButton
          size="sm"
          isSaved={isRestaurantSaved(restaurant.id)}
          subject={restaurant.name}
          onToggle={() => toggleRestaurant(restaurant)}
        />
      </div>
      <Link
        href={restaurantHref(restaurant)}
        className="block px-4 py-3.5 no-underline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
      >
        <div className="flex items-start justify-between gap-3 pr-11">
          <Thumb
            src={restaurant.image_url}
            name={restaurant.name}
            size={64}
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-ink">
              {restaurant.name}
            </h2>
            <p className="mt-0.5 truncate text-[13px] text-ink-3">
              {restaurant.area} · {restaurant.city}
            </p>
          </div>
          {/* The rating is a number, so it gets tabular figures like money. */}
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-chip border px-2 py-0.5",
              "text-[12px] font-semibold tabular-nums",
              "border-ok/25 bg-ok-soft text-ok",
            )}
          >
            <span aria-hidden="true">★</span>
            <span className="sr-only">Rated</span>
            {formatRating(restaurant.rating)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-ink-2">
          <span className="tabular-nums">
            {formatMoneyShort(restaurant.price_for_two)} for two
          </span>
          <span aria-hidden="true" className="text-ink-4">
            ·
          </span>
          <span className="tabular-nums">
            {restaurant.avg_prep_minutes} min prep
          </span>
          <span aria-hidden="true" className="text-ink-4">
            ·
          </span>
          <span className="tabular-nums text-ink-3">
            {restaurant.rating_count.toLocaleString()} ratings
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={isOpen ? "ok" : "mute"}>{isOpen ? "Open now" : "Closed"}</Badge>
          {isPureVeg ? <Badge tone="ok">Pure veg</Badge> : null}
          <span className="font-mono text-[11px] text-ink-3">
            {formatClock(restaurant.opens_at)}–{formatClock(restaurant.closes_at)}
          </span>
        </div>
      </Link>
    </Card>
  );
}
