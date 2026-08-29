"use client";

import * as React from "react";
import type { MenuItem } from "./types";

/**
 * The cart lives in the browser. The server never sees it until POST
 * /orders/quote, which is why the quote endpoint exists: it is the only
 * authority on price. Nothing here ever adds up a total for display.
 *
 * One restaurant at a time — QuoteRequest carries a single restaurant_id, so
 * a mixed cart could not be priced at all.
 *
 * Every update returns a new object. No line is mutated in place.
 */
const STORAGE_KEY = "foodishi.customer.cart.v1";
const MAX_QUANTITY = 50; // OrderItemIn caps quantity at 50.

export interface CartLine {
  readonly menuItemId: number;
  readonly name: string;
  /** The decimal string the API sent. Kept verbatim; only formatted for display. */
  readonly unitPrice: string;
  readonly quantity: number;
  readonly isVeg: boolean;
}

export interface CartState {
  readonly restaurantId: number | null;
  readonly restaurantName: string | null;
  readonly restaurantSlug: string | null;
  readonly lines: readonly CartLine[];
  /** Chosen on the cart screen; delivery fee and distance depend on it. */
  readonly addressId: number | null;
  readonly couponCode: string | null;
}

export const EMPTY_CART: CartState = {
  restaurantId: null,
  restaurantName: null,
  restaurantSlug: null,
  lines: [],
  addressId: null,
  couponCode: null,
};

export interface CartRestaurant {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
}

interface CartContextValue {
  readonly cart: CartState;
  /** True until localStorage has been read, so the UI can hold its skeleton. */
  readonly isReady: boolean;
  readonly itemCount: number;
  addItem: (restaurant: CartRestaurant, item: MenuItem, quantity?: number) => void;
  setQuantity: (menuItemId: number, quantity: number) => void;
  removeItem: (menuItemId: number) => void;
  setAddressId: (addressId: number | null) => void;
  setCouponCode: (code: string | null) => void;
  clear: () => void;
}

const CartContext = React.createContext<CartContextValue | null>(null);

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.menuItemId === "number" &&
    typeof line.name === "string" &&
    typeof line.unitPrice === "string" &&
    typeof line.quantity === "number" &&
    typeof line.isVeg === "boolean"
  );
}

/** Never trust storage: another tab, an older build or a user can write it. */
function parseStoredCart(raw: string | null): CartState {
  if (raw === null) return EMPTY_CART;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_CART;
    const value = parsed as Record<string, unknown>;
    const lines = Array.isArray(value.lines) ? value.lines.filter(isCartLine) : [];
    return {
      restaurantId: typeof value.restaurantId === "number" ? value.restaurantId : null,
      restaurantName: typeof value.restaurantName === "string" ? value.restaurantName : null,
      restaurantSlug: typeof value.restaurantSlug === "string" ? value.restaurantSlug : null,
      lines,
      addressId: typeof value.addressId === "number" ? value.addressId : null,
      couponCode: typeof value.couponCode === "string" ? value.couponCode : null,
    };
  } catch {
    return EMPTY_CART;
  }
}

function persist(cart: CartState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Private browsing blocks storage. The in-memory cart still works for
    // this tab, so losing persistence must not lose the order.
  }
}

function withLines(cart: CartState, lines: readonly CartLine[]): CartState {
  if (lines.length > 0) return { ...cart, lines };
  // An emptied cart releases the restaurant and the coupon with it.
  return { ...EMPTY_CART, addressId: cart.addressId };
}

export function CartProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const [cart, setCart] = React.useState<CartState>(EMPTY_CART);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    setCart(parseStoredCart(window.localStorage.getItem(STORAGE_KEY)));
    setIsReady(true);
  }, []);

  const update = React.useCallback((next: (current: CartState) => CartState) => {
    setCart((current) => {
      const updated = next(current);
      persist(updated);
      return updated;
    });
  }, []);

  const addItem = React.useCallback<CartContextValue["addItem"]>(
    (restaurant, item, quantity = 1) => {
      update((current) => {
        // Switching restaurant replaces the cart: the API cannot price two.
        const base =
          current.restaurantId === null || current.restaurantId === restaurant.id
            ? current
            : { ...EMPTY_CART, addressId: current.addressId };

        const existing = base.lines.find((line) => line.menuItemId === item.id);
        const nextQuantity = Math.min((existing?.quantity ?? 0) + quantity, MAX_QUANTITY);

        const lines =
          existing === undefined
            ? [
                ...base.lines,
                {
                  menuItemId: item.id,
                  name: item.name,
                  unitPrice: String(item.price),
                  quantity: nextQuantity,
                  isVeg: item.is_veg,
                },
              ]
            : base.lines.map((line) =>
                line.menuItemId === item.id ? { ...line, quantity: nextQuantity } : line,
              );

        return {
          ...base,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          restaurantSlug: restaurant.slug,
          lines,
        };
      });
    },
    [update],
  );

  const setQuantity = React.useCallback<CartContextValue["setQuantity"]>(
    (menuItemId, quantity) => {
      update((current) => {
        const clamped = Math.min(Math.max(quantity, 0), MAX_QUANTITY);
        const lines =
          clamped === 0
            ? current.lines.filter((line) => line.menuItemId !== menuItemId)
            : current.lines.map((line) =>
                line.menuItemId === menuItemId ? { ...line, quantity: clamped } : line,
              );
        return withLines(current, lines);
      });
    },
    [update],
  );

  const removeItem = React.useCallback<CartContextValue["removeItem"]>(
    (menuItemId) => {
      update((current) =>
        withLines(
          current,
          current.lines.filter((line) => line.menuItemId !== menuItemId),
        ),
      );
    },
    [update],
  );

  const setAddressId = React.useCallback<CartContextValue["setAddressId"]>(
    (addressId) => update((current) => ({ ...current, addressId })),
    [update],
  );

  const setCouponCode = React.useCallback<CartContextValue["setCouponCode"]>(
    (couponCode) => update((current) => ({ ...current, couponCode })),
    [update],
  );

  const clear = React.useCallback(() => {
    update((current) => ({ ...EMPTY_CART, addressId: current.addressId }));
  }, [update]);

  const itemCount = cart.lines.reduce((total, line) => total + line.quantity, 0);

  const value = React.useMemo<CartContextValue>(
    () => ({
      cart,
      isReady,
      itemCount,
      addItem,
      setQuantity,
      removeItem,
      setAddressId,
      setCouponCode,
      clear,
    }),
    [
      cart,
      isReady,
      itemCount,
      addItem,
      setQuantity,
      removeItem,
      setAddressId,
      setCouponCode,
      clear,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = React.useContext(CartContext);
  if (context === null) {
    throw new Error("useCart must be used inside <CartProvider>.");
  }
  return context;
}

export { MAX_QUANTITY };
