import type { Address, OrderDetail, OrderEvent, OrderRead, Payment } from "../../types";

import addressesSeed from "./data/addresses.json";
import orderDetailsSeed from "./data/order-details.json";
import orderEventsSeed from "./data/order-events.json";
import ordersSeed from "./data/orders.json";
import paymentsSeed from "./data/payments.json";

/**
 * The writable half of the fixture source.
 *
 * The JSON files are the seed and are never mutated. Anything the customer does
 * — placing an order, paying, cancelling, saving an address — lands here, on
 * top of that seed, and is persisted so a placed order survives a reload
 * rather than vanishing on the way to the tracking screen.
 *
 * Not React state: services are plain async functions and must work when
 * called from anywhere. `lib/queries/*` already re-reads through TanStack
 * Query, which is what makes a write show up on screen.
 */
const STORAGE_KEY = "foodishi.customer.fixtures.v1";

interface Overlay {
  /** Orders placed in this browser, newest first. */
  readonly orders: readonly OrderDetail[];
  readonly payments: Readonly<Record<string, readonly Payment[]>>;
  readonly events: Readonly<Record<string, readonly OrderEvent[]>>;
  readonly addresses: readonly Address[];
  /** Idempotency key -> order id, so a retried place does not double up. */
  readonly placedKeys: Readonly<Record<string, number>>;
  readonly nextId: number;
}

// The list rows carry no `items`; the detail map does, and covers every id.
const SEED_LIST = ordersSeed as readonly OrderRead[];
type SeedDetail = Omit<OrderDetail, "items"> & {
  readonly items: ReadonlyArray<Omit<OrderDetail["items"][number], "modifiers">>;
};

/**
 * The seed JSON predates `OrderItemRead.modifiers`, so its lines have none.
 * Filled in once here, as the API now always sends it, rather than every
 * reader guarding against a field the type says is always present.
 */
function withLineModifiers(order: SeedDetail): OrderDetail {
  return { ...order, items: order.items.map((item) => ({ ...item, modifiers: [] })) };
}

const SEED_DETAILS: Readonly<Record<string, OrderDetail>> = Object.fromEntries(
  Object.entries(orderDetailsSeed as unknown as Readonly<Record<string, SeedDetail>>).map(
    ([id, order]) => [id, withLineModifiers(order)],
  ),
);
const SEED_ORDERS: readonly OrderDetail[] = SEED_LIST.map(
  (row) => SEED_DETAILS[String(row.id)],
).filter((row): row is OrderDetail => row !== undefined);
const SEED_EVENTS = orderEventsSeed as Readonly<Record<string, readonly OrderEvent[]>>;
const SEED_PAYMENTS = paymentsSeed as Readonly<Record<string, readonly Payment[]>>;
const SEED_ADDRESSES = addressesSeed as readonly Address[];

/** Above every seeded id, so a new order can never collide with one. */
const FIRST_NEW_ID =
  Math.max(0, ...SEED_ORDERS.map((order) => order.id)) + 1;

const EMPTY: Overlay = {
  orders: [],
  payments: {},
  events: {},
  addresses: [],
  placedKeys: {},
  nextId: FIRST_NEW_ID,
};

let overlay: Overlay = EMPTY;
let hasLoaded = false;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function load(): Overlay {
  if (hasLoaded || !isBrowser()) return overlay;
  hasLoaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<Overlay>;
      overlay = {
        ...EMPTY,
        ...parsed,
        // A stored counter from an older seed could sit below the seeded ids.
        nextId: Math.max(parsed.nextId ?? FIRST_NEW_ID, FIRST_NEW_ID),
      };
    }
  } catch {
    // Unreadable overlay, or storage blocked. The seed alone still renders.
    overlay = EMPTY;
  }
  return overlay;
}

function commit(next: Overlay): void {
  overlay = next;
  hasLoaded = true;
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // In-memory is enough for this tab.
  }
}

export function readOverlay(): Overlay {
  return load();
}

export function updateOverlay(next: (current: Overlay) => Overlay): Overlay {
  const updated = next(load());
  commit(updated);
  return updated;
}

export function takeNextOrderId(): number {
  return updateOverlay((current) => ({ ...current, nextId: current.nextId + 1 })).nextId - 1;
}

/** Seed plus overlay, newest first. The overlay wins on a shared id. */
export function allOrders(): readonly OrderDetail[] {
  const current = load();
  const overridden = new Set(current.orders.map((order) => order.id));
  const seeded = SEED_ORDERS.filter((order) => !overridden.has(order.id));
  return [...current.orders, ...seeded].sort(
    (left, right) =>
      new Date(right.placed_at).getTime() - new Date(left.placed_at).getTime(),
  );
}

export function findOrder(orderId: number): OrderDetail | null {
  return allOrders().find((order) => order.id === orderId) ?? null;
}

/** Replace one order, whether it came from the seed or the overlay. */
export function putOrder(order: OrderDetail): void {
  updateOverlay((current) => ({
    ...current,
    orders: [
      order,
      ...current.orders.filter((row) => row.id !== order.id),
    ],
  }));
}

export function paymentsFor(orderId: number): readonly Payment[] {
  const key = String(orderId);
  const current = load();
  return current.payments[key] ?? SEED_PAYMENTS[key] ?? [];
}

export function putPayment(orderId: number, payment: Payment): void {
  const key = String(orderId);
  updateOverlay((current) => ({
    ...current,
    payments: {
      ...current.payments,
      [key]: [...(current.payments[key] ?? SEED_PAYMENTS[key] ?? []), payment],
    },
  }));
}

export function replacePayments(orderId: number, rows: readonly Payment[]): void {
  updateOverlay((current) => ({
    ...current,
    payments: { ...current.payments, [String(orderId)]: rows },
  }));
}

export function eventsFor(orderId: number): readonly OrderEvent[] {
  const key = String(orderId);
  const current = load();
  return current.events[key] ?? SEED_EVENTS[key] ?? [];
}

export function appendEvent(orderId: number, event: OrderEvent): void {
  const key = String(orderId);
  updateOverlay((current) => ({
    ...current,
    events: {
      ...current.events,
      [key]: [...(current.events[key] ?? SEED_EVENTS[key] ?? []), event],
    },
  }));
}

export function allAddresses(): readonly Address[] {
  return [...SEED_ADDRESSES, ...load().addresses];
}

export function putAddress(address: Address): void {
  updateOverlay((current) => ({
    ...current,
    addresses: [...current.addresses, address],
  }));
}

export function rememberPlaced(key: string, orderId: number): void {
  updateOverlay((current) => ({
    ...current,
    placedKeys: { ...current.placedKeys, [key]: orderId },
  }));
}

export function recallPlaced(key: string): number | null {
  return load().placedKeys[key] ?? null;
}

/** Wipes only what this browser added. The JSON seed is untouched. */
export function resetFixtures(): void {
  commit(EMPTY);
}
