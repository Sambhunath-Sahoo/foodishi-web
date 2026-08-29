"use client";

import * as React from "react";
import { useCart, type CartRestaurant } from "./cart";
import type { MenuItem } from "./types";

/**
 * Adding a dish, with the one-kitchen rule asked about in front of the customer
 * rather than applied behind them.
 *
 * A cart holds one restaurant at a time — QuoteRequest carries a single
 * restaurant_id, so a mixed cart could not be priced at all — which means a
 * dish from a second kitchen has to ask first, naming what would be lost.
 *
 * Two screens add to the cart (the menu and a single dish) and the confirm step
 * is identical on both, so it lives here once instead of drifting in two files.
 * The dialog that renders `pendingSwitch` is <CartSwitchDialog>.
 */
export interface AddToCartFlow {
  /** Adds straight away, or parks the dish on `pendingSwitch` to be confirmed. */
  readonly add: (item: MenuItem) => void;
  /** The dish waiting on a confirm, or null when nothing is waiting. */
  readonly pendingSwitch: MenuItem | null;
  readonly confirmSwitch: () => void;
  readonly cancelSwitch: () => void;
}

/**
 * `restaurant` is null until its detail read lands. Adding is a no-op until
 * then: the cart stores the kitchen's name and slug alongside the lines, so a
 * line added without them would render as an order from nowhere.
 */
export function useAddToCart(restaurant: CartRestaurant | null): AddToCartFlow {
  const { cart, addItem } = useCart();
  const [pendingSwitch, setPendingSwitch] = React.useState<MenuItem | null>(null);

  const add = React.useCallback(
    (item: MenuItem) => {
      if (restaurant === null) return;
      const holdsAnotherKitchen =
        cart.restaurantId !== null && cart.restaurantId !== restaurant.id;
      if (holdsAnotherKitchen) {
        setPendingSwitch(item);
        return;
      }
      addItem(restaurant, item);
    },
    [addItem, cart.restaurantId, restaurant],
  );

  const confirmSwitch = React.useCallback(() => {
    if (restaurant === null || pendingSwitch === null) return;
    // addItem replaces the cart itself when the kitchen changes — this only has
    // to stop asking.
    addItem(restaurant, pendingSwitch);
    setPendingSwitch(null);
  }, [addItem, pendingSwitch, restaurant]);

  const cancelSwitch = React.useCallback(() => setPendingSwitch(null), []);

  return { add, pendingSwitch, confirmSwitch, cancelSwitch };
}
