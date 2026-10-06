"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  PageTitle,
  SegmentedControl,
  Thumb,
} from "@repo/ui";
import { FavoriteButton } from "./favorite-button";
import { VegMark } from "./dish-marks";
import { RatingBadge } from "./rating-badge";
import { LoadingLines } from "./data-states";
import { formatMoney } from "../lib/format";
import { useFavorites } from "../lib/favorites";
import { SEGMENTED_TAP_TARGET } from "../lib/tap-targets";

const TABS = [
  { value: "restaurants", label: "Kitchens" },
  { value: "items", label: "Dishes" },
] as const;

type Tab = (typeof TABS)[number]["value"];

/**
 * Saved kitchens and saved dishes.
 *
 * A saved dish links to its own screen rather than adding straight to the
 * cart: the cart holds one restaurant at a time, so a one-tap add from a list
 * spanning several kitchens would silently throw the current cart away.
 */
export function FavoritesView(): React.JSX.Element {
  const { favorites, isReady, removeRestaurant, removeItem } = useFavorites();
  const [tab, setTab] = React.useState<Tab>("restaurants");

  return (
    <div className="flex flex-col gap-5">
      <PageTitle subtitle="Kitchens and dishes you’ve hearted">Favourites</PageTitle>

      <SegmentedControl<Tab>
        options={TABS.map((row) => ({
          value: row.value,
          label: row.label,
          count:
            row.value === "restaurants"
              ? favorites.restaurants.length
              : favorites.items.length,
        }))}
        value={tab}
        onValueChange={setTab}
        ariaLabel="Favourite type"
        className={SEGMENTED_TAP_TARGET}
      />

      {!isReady ? (
        <LoadingLines count={3} label="Loading favourites" />
      ) : tab === "restaurants" ? (
        favorites.restaurants.length === 0 ? (
          <EmptyState
            title="No saved kitchens"
            detail="Tap the heart on any kitchen and it waits for you here."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {favorites.restaurants.map((row) => (
              <li key={row.restaurantId}>
                <Card>
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <Link
                      href={`/r/${row.restaurantId}-${row.slug}`}
                      className="flex min-w-0 flex-1 items-center gap-3 no-underline"
                    >
                      <Thumb src={row.imageUrl} name={row.name} size={48} />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold text-ink">
                          {row.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] text-ink-3">
                          {row.area}
                          {row.area.length > 0 && row.city.length > 0 ? " · " : ""}
                          {row.city}
                        </span>
                      </span>
                    </Link>
                    <RatingBadge rating={row.rating} />
                    <FavoriteButton
                      isSaved
                      size="sm"
                      subject={row.name}
                      onToggle={() => removeRestaurant(row.restaurantId)}
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )
      ) : favorites.items.length === 0 ? (
        <EmptyState
          title="No saved dishes"
          detail="Tap the heart on a dish to keep it here."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Saved dishes</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="flex flex-col divide-y divide-line">
              {favorites.items.map((row) => (
                <li key={row.menuItemId} className="flex items-center gap-3 py-3">
                  <Link
                    href={`/r/${row.restaurantId}-${row.restaurantSlug}/i/${row.menuItemId}`}
                    className="min-w-0 flex-1 no-underline"
                  >
                    <span className="flex items-center gap-2">
                      <VegMark isVeg={row.isVeg} />
                      <span className="truncate text-[14px] font-medium text-ink">
                        {row.name}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-ink-3">
                      {row.restaurantName}
                    </span>
                  </Link>
                  <span className="shrink-0 text-[14px] tabular-nums text-ink-2">
                    {formatMoney(row.unitPrice)}
                  </span>
                  <FavoriteButton
                    isSaved
                    size="sm"
                    subject={row.name}
                    onToggle={() => removeItem(row.menuItemId)}
                  />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
