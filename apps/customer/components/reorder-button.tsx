"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui";
import { useCart } from "../lib/cart";
import { useOrder } from "../lib/queries/orders";
import { useMenu, useRestaurant } from "../lib/queries/catalog";

/**
 * Put a previous order back in the cart.
 *
 * The old order's lines are replayed against today's menu, not trusted as-is:
 * a dish may have been delisted, made unavailable, or repriced since. Whatever
 * survives goes in the cart and the customer is told what did not, because
 * silently dropping a line would show a total they never agreed to.
 */
export function ReorderButton({
  orderId,
  restaurantId,
  size = "sm",
}: {
  readonly orderId: number;
  readonly restaurantId: number;
  readonly size?: "sm" | "md";
}): React.JSX.Element {
  const router = useRouter();
  const { addItem, clear } = useCart();
  const [isArmed, setIsArmed] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);

  // Only fetched once the button is pressed: an order-history page holds ten of
  // these, and pre-loading ten menus to render ten buttons is a waste.
  const order = useOrder(isArmed ? orderId : null);
  const restaurant = useRestaurant(isArmed ? restaurantId : null);
  const menu = useMenu(isArmed ? restaurantId : null);

  const isLoading =
    isArmed && (order.isPending || restaurant.isPending || menu.isPending);

  React.useEffect(() => {
    if (!isArmed) return;
    if (order.data === undefined || restaurant.data === undefined || menu.data === undefined) {
      return;
    }

    const available = new Map(
      menu.data
        .flatMap((category) => category.items)
        .filter((item) => item.is_available)
        .map((item) => [item.id, item] as const),
    );

    const wanted = order.data.items;
    const usable = wanted.filter((line) => available.has(line.menu_item_id));

    if (usable.length === 0) {
      setProblem("Nothing from that order is on the menu today.");
      setIsArmed(false);
      return;
    }

    // Replace rather than merge: the cart holds one restaurant, and a reorder
    // means "this order again", not "this order plus whatever was already in".
    clear();
    for (const line of usable) {
      const item = available.get(line.menu_item_id);
      if (item === undefined) continue;
      addItem(
        {
          id: restaurant.data.id,
          name: restaurant.data.name,
          slug: restaurant.data.slug,
        },
        item,
        line.quantity,
      );
    }

    const dropped = wanted.length - usable.length;
    setIsArmed(false);
    router.push(
      dropped > 0 ? `/cart?dropped=${String(dropped)}` : "/cart",
    );
  }, [
    isArmed,
    order.data,
    restaurant.data,
    menu.data,
    addItem,
    clear,
    router,
  ]);

  const failure =
    order.error ?? restaurant.error ?? menu.error ?? null;

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="outline"
        size={size}
        disabled={isLoading}
        onClick={() => {
          setProblem(null);
          setIsArmed(true);
        }}
      >
        {isLoading ? "Building cart…" : "Reorder"}
      </Button>
      {problem !== null ? (
        <p aria-live="polite" className="text-[12px] text-crit">
          {problem}
        </p>
      ) : null}
      {failure !== null && isArmed ? (
        <p aria-live="polite" className="text-[12px] text-crit">
          Could not read that order. Try again.
        </p>
      ) : null}
    </div>
  );
}
