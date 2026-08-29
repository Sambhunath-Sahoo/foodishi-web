import type { CartState } from "./cart";
import type { QuoteRequest } from "./types";

/**
 * The cart, in the shape POST /orders/quote wants. Returns null while the
 * request would be incomplete — there is no address yet, or nothing to price —
 * because a half-built quote is a 422 the customer cannot act on.
 *
 * POST /orders takes the identical body, which is the point: the quote and the
 * order run through the same pricing service, so what the cart shows is what
 * the order charges.
 */
export function toQuoteRequest(cart: CartState): QuoteRequest | null {
  if (cart.restaurantId === null) return null;
  if (cart.addressId === null) return null;
  if (cart.lines.length === 0) return null;

  return {
    restaurant_id: cart.restaurantId,
    address_id: cart.addressId,
    items: cart.lines.map((line) => ({
      menu_item_id: line.menuItemId,
      quantity: line.quantity,
    })),
    coupon_code: cart.couponCode,
  };
}
