/**
 * Every cache key this console uses, in one place.
 *
 * All of them start with the signed-in profile id. That is cache hygiene, not
 * authorization: signing out and back in as somebody else must not show the
 * previous person's kitchen from cache. The data source settles who may read
 * what — the fixtures from their own session, the API from its bearer token.
 *
 * The restaurant id is in every restaurant-scoped key for the same reason:
 * somebody who staffs two kitchens switches between them, and a queue cached
 * under one must never be drawn under the other.
 */
export const queryKeys = {
  /** Who is signed in, and what they may act for. Not scoped — it IS the scope. */
  auth: () => ["auth"] as const,

  liveOrders: (userId: string, restaurantId: string) =>
    ["orders", "live", userId, restaurantId] as const,
  /**
   * A filtered page of history. The filter object is part of the key, so
   * changing a status or a date range is a different query rather than a
   * refetch that briefly shows the wrong rows.
   */
  orderHistory: (userId: string, restaurantId: string, filter: unknown) =>
    ["orders", "history", userId, restaurantId, filter] as const,
  order: (userId: string, orderId: string) =>
    ["orders", "detail", userId, orderId] as const,
  orderClock: (userId: string, orderId: string) =>
    ["orders", "clock", userId, orderId] as const,
  orderEvents: (userId: string, orderId: string) =>
    ["orders", "events", userId, orderId] as const,
  customer: (userId: string, customerId: number) =>
    ["customers", userId, customerId] as const,
  address: (userId: string, addressId: number) =>
    ["addresses", userId, addressId] as const,

  menu: (userId: string, restaurantId: string) =>
    ["menu", userId, restaurantId] as const,
  modifiers: (userId: string, restaurantId: string) =>
    ["modifiers", userId, restaurantId] as const,

  restaurant: (userId: string, restaurantId: string) =>
    ["restaurant", userId, restaurantId] as const,
  policy: (userId: string, restaurantId: string) =>
    ["policy", userId, restaurantId] as const,

  staff: (userId: string, restaurantId: string) =>
    ["staff", userId, restaurantId] as const,

  offers: (userId: string, restaurantId: string) =>
    ["offers", userId, restaurantId] as const,
  coupons: (userId: string, restaurantId: string) =>
    ["coupons", userId, restaurantId] as const,

  salesReport: (userId: string, restaurantId: string, window: unknown) =>
    ["reports", "sales", userId, restaurantId, window] as const,
  popularItems: (userId: string, restaurantId: string, window: unknown) =>
    ["reports", "items", userId, restaurantId, window] as const,
  performance: (userId: string, restaurantId: string, window: unknown) =>
    ["reports", "performance", userId, restaurantId, window] as const,

  earnings: (userId: string, restaurantId: string, window: unknown) =>
    ["payments", "earnings", userId, restaurantId, window] as const,
  settlements: (userId: string, restaurantId: string) =>
    ["payments", "settlements", userId, restaurantId] as const,
  ledger: (userId: string, restaurantId: string, offset: number) =>
    ["payments", "ledger", userId, restaurantId, offset] as const,
} as const;

/** The queue refreshes on its own so nobody has to remember to pull down. */
export const QUEUE_REFRESH_MS = 10_000;
/** The rails and tallies only have to be roughly right. */
export const SLOW_REFRESH_MS = 60_000;
/** How long a membership is trusted before it is re-read. */
export const MEMBERSHIP_STALE_MS = 60_000;
/** A placed order's lines never change, so they are read once. */
export const FROZEN_STALE_MS = Number.POSITIVE_INFINITY;
/** Reference data somebody else owns — a customer, an address. */
export const REFERENCE_STALE_MS = 300_000;
