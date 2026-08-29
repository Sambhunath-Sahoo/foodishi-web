"use client";

import * as React from "react";
import Link from "next/link";
import { Button, Thumb, cn } from "@repo/ui";
import { SpiceMeter, VegMark } from "./dish-marks";
import { FavoriteButton } from "./favorite-button";
import { useFavorites } from "../lib/favorites";
import { QuantityStepper } from "./quantity-stepper";
import { formatMoney } from "../lib/format";
import { MAX_QUANTITY } from "../lib/cart";
import type { MenuItem } from "../lib/types";

/**
 * One dish. The veg mark, the spice pips and the price all come from the API
 * row; nothing here is decorative.
 *
 * The photo and the text open the dish's own screen; the Add control stays
 * outside that link, because tapping Add is the common case and it must never
 * navigate.
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

  return (
    <li
      className={cn(
        "border-b border-line last:border-b-0",
        isUnavailable && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3.5">
        <Link
          href={href}
          className={cn(
            "flex min-w-0 flex-1 items-start gap-3 rounded-card no-underline",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          <Thumb src={item.image_url} name={item.name} size={56} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <VegMark isVeg={item.is_veg} />
              <h3 className="min-w-0 truncate text-sm font-semibold text-ink">
                {item.name}
              </h3>
              {/* The one hint that the row goes somewhere. Aria-hidden because
                  the link already announces itself as one. */}
              <span aria-hidden="true" className="shrink-0 text-ink-4">
                ›
              </span>
            </div>

            <p className="mt-1 text-sm tabular-nums text-ink">
              {formatMoney(item.price)}
            </p>

            {item.description !== null && item.description !== "" ? (
              <p className="mt-1 text-[13px] leading-snug text-ink-3">
                {item.description}
              </p>
            ) : null}

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <SpiceMeter level={item.spice_level} />
              <span className="text-[12px] text-ink-3">
                Serves {item.serves}
              </span>
              {item.calories !== null ? (
                <span className="text-[12px] tabular-nums text-ink-3">
                  {item.calories} kcal
                </span>
              ) : null}
            </div>
          </div>
        </Link>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <FavoriteButton
            size="sm"
            isSaved={isItemSaved(item.id)}
            subject={item.name}
            onToggle={() => toggleItem(item, restaurant)}
          />
          {isUnavailable ? (
            <span className="rounded-chip border border-mute/25 bg-mute-soft px-2.5 py-1 text-[12px] font-medium text-mute">
              Off the menu today
            </span>
          ) : quantity > 0 ? (
            <QuantityStepper
              quantity={quantity}
              itemName={item.name}
              max={MAX_QUANTITY}
              onChange={onSetQuantity}
            />
          ) : (
            <Button size="sm" onClick={onAdd}>
              Add
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
