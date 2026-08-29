import { api } from "@repo/api-client";
import type {
  Address,
  AddressCreate,
  CancelResult,
  CouponValidation,
  Cuisine,
  MenuCategory,
  MenuItem,
  MenuItemImage,
  OrderDetail,
  OrderEvent,
  OrderRead,
  OrderStatusRead,
  Page,
  Payment,
  Quote,
  QuoteRequest,
  RestaurantDetail,
  RestaurantPolicy,
  RestaurantSummary,
} from "../../types";
import type { PaymentMethod } from "../../payment";
import type {
  CancelOrderCommand,
  CatalogService,
  OrdersService,
  PlaceOrderCommand,
  RestaurantQuery,
  FoodishiServices,
  ValidateCouponCommand,
} from "../types";

/**
 * The real thing: the FastAPI service over HTTP.
 *
 * Every call here is exactly the request the query layer used to make inline,
 * moved behind the interface and nothing more. The fetcher attaches the bearer
 * token, so no method takes one.
 */

/** An empty string means "no filter", which is an absent parameter, not "". */
function omitEmpty(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value;
}

const catalog: CatalogService = {
  listCuisines: () => api.get<readonly Cuisine[]>("/cuisines"),

  listRestaurants: (query: RestaurantQuery) =>
    api.get<Page<RestaurantSummary>>("/restaurants", {
      query: {
        city: omitEmpty(query.city),
        cuisine: omitEmpty(query.cuisine),
        q: omitEmpty(query.q),
        open_now: query.openNow === true ? true : undefined,
        sort: query.sort,
        limit: query.limit,
        offset: query.offset,
      },
    }),

  getRestaurant: (restaurantId) =>
    api.get<RestaurantDetail>(`/restaurants/${restaurantId}`),

  getPolicy: (restaurantId) =>
    api.get<RestaurantPolicy>(`/restaurants/${restaurantId}/policy`),

  getMenu: (restaurantId) =>
    api.get<readonly MenuCategory[]>(`/restaurants/${restaurantId}/menu`),

  getMenuItem: (menuItemId) => api.get<MenuItem>(`/menu-items/${menuItemId}`),

  getMenuItemImages: (menuItemId) =>
    api.get<readonly MenuItemImage[]>(`/menu-items/${menuItemId}/images`),

  // One count, not a page of dishes: `total` is the whole answer.
  countNonVegItems: async (restaurantId) => {
    const page = await api.get<Page<MenuItem>>(
      `/restaurants/${restaurantId}/menu/search`,
      { query: { is_veg: false, limit: 1, offset: 0 } },
    );
    return page.total;
  },
};

const orders: OrdersService = {
  listAddresses: (userId) =>
    api.get<readonly Address[]>(`/users/${userId}/addresses`),

  createAddress: (userId, payload: AddressCreate) =>
    api.post<Address>(`/users/${userId}/addresses`, payload),

  quote: (request: QuoteRequest, userId) =>
    api.post<Quote>("/orders/quote", request, {
      query: { user_id: userId ?? undefined },
    }),

  // delivery_note rides on the ORDER body only, never on the quote — it has no
  // effect on price, and OrderCreate is the one schema that accepts it.
  placeOrder: ({ userId, request, idempotencyKey, deliveryNote }: PlaceOrderCommand) =>
    api.post<OrderDetail>(
      "/orders",
      { ...request, delivery_note: deliveryNote },
      { query: { user_id: userId }, idempotencyKey },
    ),

  getOrder: (orderId) => api.get<OrderDetail>(`/orders/${orderId}`),

  getOrderStatus: (orderId) =>
    api.get<OrderStatusRead>(`/orders/${orderId}/status`),

  listOrderEvents: (orderId) =>
    api.get<readonly OrderEvent[]>(`/orders/${orderId}/events`),

  // GET /orders?user_id= is the staff queue and ignores that parameter; the
  // caller-scoped list reads the identity out of the token instead.
  listMyOrders: (limit, offset, live) =>
    api.get<Page<OrderRead>>("/me/orders", {
      query: { limit, offset, live: live ? true : undefined },
    }),

  cancelOrder: ({ orderId, userId, reason }: CancelOrderCommand) =>
    api.post<CancelResult>(`/orders/${orderId}/cancel`, {
      actor_type: "user",
      actor_id: userId,
      reason: reason === undefined || reason === "" ? null : reason,
    }),

  listPayments: (orderId) =>
    api.get<Page<Payment>>(`/orders/${orderId}/payments`, {
      query: { limit: 20, offset: 0 },
    }),

  // No amount and no idempotency key: the server takes the amount from the
  // order so a client cannot underpay, and the route accepts no key.
  createPayment: (orderId, method: PaymentMethod) =>
    api.post<Payment>(`/orders/${orderId}/payments`, { method }),

  validateCoupon: ({ code, restaurantId, userId, subtotal }: ValidateCouponCommand) =>
    api.post<CouponValidation>("/coupons/validate", {
      code,
      restaurant_id: restaurantId,
      user_id: userId,
      subtotal,
    }),
};

export const apiServices: FoodishiServices = { catalog, orders, sourceName: "api" };
