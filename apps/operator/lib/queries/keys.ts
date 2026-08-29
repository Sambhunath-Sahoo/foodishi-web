/**
 * Every cache key in the console, built in one place.
 *
 * Keys are written as functions rather than inline arrays because invalidation
 * is the half that goes wrong: deactivating a kitchen has to refresh the
 * catalogue *and* the overview's active count, and a key spelled slightly
 * differently at the write site than at the read site produces a screen that
 * quietly keeps showing the old answer. The prefixes below are what each
 * mutation invalidates, so the two can never drift.
 */

export const keys = {
  /** Everything derived from orders: the overview rails, the charts, the funnel. */
  metrics: {
    all: ["metrics"] as const,
    summary: () => ["metrics", "summary"] as const,
    /** The sidebar's own figures. Read on every page, so it gets its own key. */
    workload: () => ["metrics", "workload"] as const,
    overTime: (days: number) => ["metrics", "over-time", days] as const,
    funnel: () => ["metrics", "funnel"] as const,
    restaurants: () => ["metrics", "restaurants"] as const,
  },

  restaurants: {
    all: ["restaurants"] as const,
    list: () => ["restaurants", "list"] as const,
    /** id -> row, read once and kept: the board resolves names from it. */
    directory: () => ["restaurants", "directory"] as const,
    one: (restaurantId: number | null) => ["restaurants", restaurantId] as const,
  },

  cuisines: {
    all: ["cuisines"] as const,
    list: () => ["cuisines"] as const,
  },

  customers: {
    all: ["customers"] as const,
    page: (q: string, isActive: boolean | null, offset: number) =>
      ["customers", "page", q, isActive, offset] as const,
    directory: () => ["customers", "directory"] as const,
    count: (isActive: boolean | null) => ["customers", "count", isActive] as const,
    one: (userId: number | null) => ["customers", userId] as const,
    addresses: (userId: number | null) => ["customers", userId, "addresses"] as const,
  },

  orders: {
    all: ["orders"] as const,
    /** The board's own key. Serialised so two different filters are two entries. */
    board: (fingerprint: string) => ["orders", "board", fingerprint] as const,
    live: () => ["orders", "live"] as const,
    byCustomer: (userId: number | null) => ["orders", "by-customer", userId] as const,
    detail: (orderId: number | null) => ["orders", orderId, "detail"] as const,
    events: (orderId: number | null) => ["orders", orderId, "events"] as const,
    payments: (orderId: number | null) => ["orders", orderId, "payments"] as const,
    refunds: (orderId: number | null) => ["orders", orderId, "refunds"] as const,
    delivery: (orderId: number | null) => ["orders", orderId, "delivery"] as const,
    /** Riders for a set of board rows, keyed by the ids asked for. */
    deliveriesFor: (fingerprint: string) => ["orders", "riders", fingerprint] as const,
  },

  deliveries: {
    all: ["deliveries"] as const,
    board: (fingerprint: string) => ["deliveries", "board", fingerprint] as const,
    partners: () => ["deliveries", "partners"] as const,
    /** One count per status, for the board's stage cards. */
    counts: () => ["deliveries", "counts"] as const,
  },

  coupons: {
    all: ["coupons"] as const,
    list: () => ["coupons"] as const,
  },

  finance: {
    all: ["finance"] as const,
    transactions: (fingerprint: string) => ["finance", "transactions", fingerprint] as const,
    refunds: (fingerprint: string) => ["finance", "refunds", fingerprint] as const,
    ledger: (days: number) => ["finance", "ledger", days] as const,
    paymentCounts: () => ["finance", "payment-counts"] as const,
    refundCounts: () => ["finance", "refund-counts"] as const,
  },

  reports: {
    all: ["reports"] as const,
    sales: (days: number) => ["reports", "sales", days] as const,
    restaurants: (days: number) => ["reports", "restaurants", days] as const,
    orders: (days: number) => ["reports", "orders", days] as const,
    customers: (days: number) => ["reports", "customers", days] as const,
    commission: (days: number) => ["reports", "commission", days] as const,
  },

  settings: {
    all: ["settings"] as const,
    current: () => ["settings"] as const,
  },

  applications: {
    all: ["applications"] as const,
    /** One page of the queue. The status filter is part of the key. */
    page: (status: string, offset: number) =>
      ["applications", "page", status, offset] as const,
  },
} as const;

/**
 * A filter object as one cache-key string.
 *
 * Passing the object itself would work — TanStack hashes structurally — but a
 * stable string keeps the key readable in devtools and makes it obvious that two
 * boards with the same filters share one entry.
 */
export function fingerprint(parts: Readonly<Record<string, string | number | boolean | null>>): string {
  return Object.keys(parts)
    .sort()
    .map((name) => `${name}=${String(parts[name])}`)
    .join("&");
}
