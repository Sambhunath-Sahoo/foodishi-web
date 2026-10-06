"use client";

import * as React from "react";
import Link from "next/link";
import { Button, Thumb, cn } from "@repo/ui";
import { SpiceMeter, VegMark } from "./dish-marks";
import { FavoriteButton } from "./favorite-button";
import { useFavorites } from "../lib/favorites";
import { QuantityStepper } from "./quantity-stepper";
import { formatMoneyShort } from "../lib/format";
import { MAX_QUANTITY } from "../lib/cart";
import type { MenuItem } from "../lib/types";

/**
 * One dish. The veg mark, the spice pips and the price all come from the API
 * row; nothing here is decorative.
 *
 * The text and the photo open the dish's own screen; the Add control stays
 * outside those links, because tapping Add is the common case and it must
 * never navigate.
 *
 * With a photo, the control overlaps the photo's bottom edge and the heart sits
 * in its corner, so every row with a photo has the same right-hand shape. The
 * heart used to be stacked above Add in its own column, which pushed Add down
 * by a different amount on every row. Without a photo there is no tile at all —
 * a 64px grey square of initials said "image missing" forty times a menu.
 */
export function MenuItemRow({
  item,
  href,
  restaurant,
  quantity,
  onAdd,
  onSetQuantity,
}: {
  readonly item: MenuItem;
  /** The dish screen — see menuItemHref. */
  readonly href: string;
  /** Needed to save the dish: a favourite has to name its kitchen. */
  readonly restaurant: {
    readonly id: number;
    readonly name: string;
    readonly slug: string;
  };
  readonly quantity: number;
  readonly onAdd: () => void;
  readonly onSetQuantity: (next: number) => void;
}): React.JSX.Element {
  const isUnavailable = !item.is_available;
  const { isItemSaved, toggleItem } = useFavorites();
  const showPhoto = typeof item.image_url === "string" && item.image_url !== "";

  const heart = (
    <FavoriteButton
      size={showPhoto ? "corner" : "sm"}
      isSaved={isItemSaved(item.id)}
      subject={item.name}
      onToggle={() => toggleItem(item, restaurant)}
      className={showPhoto ? "absolute -top-0.5 right-2.5" : undefined}
    />
  );

  const control = isUnavailable ? (
    <span className="inline-flex min-h-11 items-center rounded-chip border border-mute/25 bg-mute-soft px-2.5 text-[12px] font-medium text-mute">
      Off the menu today
    </span>
  ) : quantity > 0 ? (
    <QuantityStepper
      quantity={quantity}
      itemName={item.name}
      max={MAX_QUANTITY}
      onChange={onSetQuantity}
      className="bg-surface shadow-card"
    />
  ) : (
    <Button
      variant="outline"
      onClick={onAdd}
      aria-label={`Add ${item.name}`}
      className="h-11 min-w-[88px] px-5 font-semibold text-accent shadow-card"
    >
      Add
    </Button>
  );

  return (
    <li
      className={cn(
        "border-b border-line last:border-b-0",
        isUnavailable && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-4">
        <Link
          href={href}
          className={cn(
            "min-w-0 flex-1 rounded-card no-underline",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          <div className="flex items-center gap-2">
            <VegMark isVeg={item.is_veg} />
            <h3 className="min-w-0 text-sm font-semibold text-ink">{item.name}</h3>
          </div>

          <p className="mt-1 text-sm font-medium tabular-nums text-ink">
            {formatMoneyShort(item.price)}
          </p>

          {item.description !== null && item.description !== "" ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-3">
              {item.description}
            </p>
          ) : null}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <SpiceMeter level={item.spice_level} />
            <span className="text-[12px] text-ink-3">Serves {item.serves}</span>
            {item.calories !== null ? (
              <span className="text-[12px] tabular-nums text-ink-3">
                {item.calories} kcal
              </span>
            ) : null}
          </div>
        </Link>

        {showPhoto ? (
          /* 112px wide so a 112px stepper fits under the 88px photo; 110px tall
             so the 44px control overlaps the photo's bottom edge by half. */
          <div className="relative h-[110px] w-[112px] shrink-0">
            <Link
              href={href}
              tabIndex={-1}
              aria-hidden="true"
              className="absolute top-0 left-3 block rounded-card"
            >
              <Thumb src={item.image_url} name={item.name} size={88} />
            </Link>
            {heart}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">{control}</div>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            {heart}
            {control}
          </div>
        )}
      </div>
    </li>
  );
}
