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
  RestaurantSort,
  RestaurantSummary,
} from "../types";
import type { PaymentMethod } from "../payment";

/**
 * What the customer app needs from a backend, stated once.
 *
 * Two implementations satisfy it: `fixtures/` reads bundled JSON, `api/` calls
 * the FastAPI service. `lib/queries/*` depends on this interface and never on
 * either one, so swapping the source is a single line in ./index.ts — no
 * component, hook or query key changes.
 *
 * The shapes are the generated OpenAPI types on purpose. A fixture that
 * drifted from the real response would move the failure from `pnpm gen` — a
 * build error — to a runtime bug in one screen.
 */

export interface RestaurantQuery {
  readonly city?: string;
  readonly cuisine?: string;
  readonly q?: string;
  readonly openNow?: boolean;
  readonly sort?: RestaurantSort;
  readonly limit: number;
  readonly offset: number;
}

export interface CatalogService {
  listCuisines(): Promise<readonly Cuisine[]>;
  listRestaurants(query: RestaurantQuery): Promise<Page<RestaurantSummary>>;
  getRestaurant(restaurantId: number): Promise<RestaurantDetail>;
  getPolicy(restaurantId: number): Promise<RestaurantPolicy>;
  getMenu(restaurantId: number): Promise<readonly MenuCategory[]>;
  getMenuItem(menuItemId: number): Promise<MenuItem>;
  getMenuItemImages(menuItemId: number): Promise<readonly MenuItemImage[]>;
  /**
   * How many non-veg dishes a kitchen serves. Zero means pure veg — the
   * restaurant row carries no such flag, so this is the only way to ask.
   */
  countNonVegItems(restaurantId: number): Promise<number>;
}

export interface PlaceOrderCommand {
  readonly userId: number;
  readonly request: QuoteRequest;
  /** One key per attempt, reused on a network retry so nothing doubles up. */
  readonly idempotencyKey: string;
  /**
   * "Leave it at the gate." Sent with the order and stored on it, so the
   * kitchen and whoever delivers can both read it.
   *
   * Deliberately NOT on `QuoteRequest`: it changes nothing about what the order
   * costs, and putting it there would invite two copies that disagree. It is
   * separate from a per-item note, which lives on the cart line — "no onion"
   * belongs to a dish, "ring the bell twice" belongs to the journey.
   */
  readonly deliveryNote: string | null;
}

export interface CancelOrderCommand {
  readonly orderId: number;
  readonly userId: number | null;
  readonly reason?: string;
}

export interface ValidateCouponCommand {
  readonly code: string;
  readonly restaurantId: number;
  readonly userId: number;
  /** The decimal string from the current quote, never a locally added total. */
  readonly subtotal: string;
}

export interface OrdersService {
  listAddresses(userId: number): Promise<readonly Address[]>;
  createAddress(userId: number, payload: AddressCreate): Promise<Address>;
  /** The only authority on what an order costs. */
  quote(request: QuoteRequest, userId: number | null): Promise<Quote>;
  placeOrder(command: PlaceOrderCommand): Promise<OrderDetail>;
  getOrder(orderId: number): Promise<OrderDetail>;
  getOrderStatus(orderId: number): Promise<OrderStatusRead>;
  listOrderEvents(orderId: number): Promise<readonly OrderEvent[]>;
  listMyOrders(limit: number, offset: number, live: boolean): Promise<Page<OrderRead>>;
  cancelOrder(command: CancelOrderCommand): Promise<CancelResult>;
  listPayments(orderId: number): Promise<Page<Payment>>;
  createPayment(orderId: number, method: PaymentMethod): Promise<Payment>;
  validateCoupon(command: ValidateCouponCommand): Promise<CouponValidation>;
}

export interface FoodishiServices {
  readonly catalog: CatalogService;
  readonly orders: OrdersService;
  /** Named in errors and shown in the dev banner, so nobody debugs the wrong one. */
  readonly sourceName: "fixtures" | "api";
}
