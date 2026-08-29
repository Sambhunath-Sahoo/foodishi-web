/**
 * The writable half of the fixture source.
 *
 * The JSON seed is never mutated. Everything an operator does here —
 * deactivating a kitchen, editing its details, switching an account off,
 * creating a coupon, retrying a refund, reassigning a rider, saving the tax
 * rate — lands in the overlay below, on top of that seed, and is persisted so a
 * change survives a reload rather than vanishing on the next navigation.
 *
 * It is not React state, because services are plain async functions that must
 * work when called from anywhere. `lib/queries.ts` invalidates the affected
 * query keys after each write, and re-reading through TanStack Query is what
 * puts the change on screen — the same round trip a real API would need.
 *
 * Every update returns a new object rather than editing one in place. A console
 * where one screen quietly mutated a row another screen was already rendering
 * is the class of bug this whole layer exists to avoid.
 */
import type {
  CouponRead,
  DeliveryDetail,
  OrderEventRead,
  RefundRead,
  RestaurantDetail,
  UserRead,
} from "../../api-types";
import type { PlatformSettings } from "../types";
import {
  SEED_COUPONS,
  SEED_CUSTOMERS,
  SEED_DELIVERIES,
  SEED_EVENTS,
  SEED_REFUNDS,
  SEED_RESTAURANTS,
  SEED_SETTINGS,
} from "./seed";

/** Bumping the version discards overlays written against an older seed. */
const STORAGE_KEY = "foodishi.operator.fixtures.v1";

interface Overlay {
  /** Kitchen id -> the fields an operator has changed on it. */
  readonly restaurants: Readonly<Record<string, Partial<RestaurantDetail>>>;
  /** Customer id -> their account switch. The only field the console may set. */
  readonly customers: Readonly<Record<string, boolean>>;
  readonly coupons: Readonly<Record<string, Partial<CouponRead>>>;
  /** Codes created in this browser, newest first. */
  readonly newCoupons: readonly CouponRead[];
  readonly deliveries: Readonly<Record<string, Partial<DeliveryDetail>>>;
  readonly refunds: Readonly<Record<string, Partial<RefundRead>>>;
  /** Events the console itself recorded, appended after the seeded trail. */
  readonly events: Readonly<Record<string, readonly OrderEventRead[]>>;
  /** Null means "the shipped defaults", not "empty". */
  readonly settings: PlatformSettings | null;
  readonly nextCouponId: number;
  readonly nextEventId: number;
}

/** Above every seeded id, so nothing the console creates can collide. */
const FIRST_NEW_COUPON_ID = Math.max(0, ...SEED_COUPONS.map((row) => row.id)) + 1;

const FIRST_NEW_EVENT_ID =
  Math.max(
    0,
    ...Object.values(SEED_EVENTS).flatMap((trail) => trail.map((event) => event.id)),
  ) + 1;

const EMPTY: Overlay = {
  restaurants: {},
  customers: {},
  coupons: {},
  newCoupons: [],
  deliveries: {},
  refunds: {},
  events: {},
  settings: null,
  nextCouponId: FIRST_NEW_COUPON_ID,
  nextEventId: FIRST_NEW_EVENT_ID,
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
        // A counter stored against an older, smaller seed could sit below the
        // ids that seed now ships with.
        nextCouponId: Math.max(parsed.nextCouponId ?? 0, FIRST_NEW_COUPON_ID),
        nextEventId: Math.max(parsed.nextEventId ?? 0, FIRST_NEW_EVENT_ID),
      };
    }
  } catch {
    // Unreadable overlay, or storage blocked entirely. The seed alone renders.
    overlay = EMPTY;
  }
  return overlay;
}

function commit(next: Overlay): Overlay {
  overlay = next;
  hasLoaded = true;
  if (!isBrowser()) return next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // In-memory is enough for this tab; a private window is not a failure.
  }
  return next;
}

function update(next: (current: Overlay) => Overlay): Overlay {
  return commit(next(load()));
}

/* ------------------------------------------------------------ restaurants */

/** The catalogue as it stands: the seed with every local edit applied. */
export function allRestaurants(): readonly RestaurantDetail[] {
  const patches = load().restaurants;
  return SEED_RESTAURANTS.map((restaurant) => {
    const patch = patches[String(restaurant.id)];
    return patch === undefined ? restaurant : { ...restaurant, ...patch };
  });
}

export function findRestaurant(restaurantId: number): RestaurantDetail | null {
  return allRestaurants().find((row) => row.id === restaurantId) ?? null;
}

export function patchRestaurant(
  restaurantId: number,
  patch: Partial<RestaurantDetail>,
): void {
  const key = String(restaurantId);
  update((current) => ({
    ...current,
    restaurants: {
      ...current.restaurants,
      [key]: { ...current.restaurants[key], ...patch },
    },
  }));
}

/* -------------------------------------------------------------- customers */

export function allCustomers(): readonly UserRead[] {
  const switches = load().customers;
  return SEED_CUSTOMERS.map((customer) => {
    const isActive = switches[String(customer.id)];
    return isActive === undefined ? customer : { ...customer, is_active: isActive };
  });
}

export function findCustomer(userId: number): UserRead | null {
  return allCustomers().find((row) => row.id === userId) ?? null;
}

export function setCustomerSwitch(userId: number, isActive: boolean): void {
  update((current) => ({
    ...current,
    customers: { ...current.customers, [String(userId)]: isActive },
  }));
}

/* ---------------------------------------------------------------- coupons */

/** Seeded codes with their edits applied, then the ones created here. */
export function allCoupons(): readonly CouponRead[] {
  const current = load();
  const seeded = SEED_COUPONS.map((coupon) => {
    const patch = current.coupons[String(coupon.id)];
    return patch === undefined ? coupon : { ...coupon, ...patch };
  });
  return [...current.newCoupons, ...seeded];
}

export function findCoupon(couponId: number): CouponRead | null {
  return allCoupons().find((row) => row.id === couponId) ?? null;
}

export function patchCoupon(couponId: number, patch: Partial<CouponRead>): void {
  const key = String(couponId);
  const isLocal = load().newCoupons.some((coupon) => coupon.id === couponId);

  update((current) =>
    isLocal
      ? {
          ...current,
          newCoupons: current.newCoupons.map((coupon) =>
            coupon.id === couponId ? { ...coupon, ...patch } : coupon,
          ),
        }
      : {
          ...current,
          coupons: { ...current.coupons, [key]: { ...current.coupons[key], ...patch } },
        },
  );
}

export function addCoupon(build: (id: number) => CouponRead): CouponRead {
  const id = load().nextCouponId;
  const coupon = build(id);
  update((current) => ({
    ...current,
    newCoupons: [coupon, ...current.newCoupons],
    nextCouponId: current.nextCouponId + 1,
  }));
  return coupon;
}

/* ------------------------------------------------------------- deliveries */

export function allDeliveries(): readonly DeliveryDetail[] {
  const patches = load().deliveries;
  return SEED_DELIVERIES.map((delivery) => {
    const patch = patches[String(delivery.id)];
    return patch === undefined ? delivery : { ...delivery, ...patch };
  });
}

export function findDelivery(deliveryId: number): DeliveryDetail | null {
  return allDeliveries().find((row) => row.id === deliveryId) ?? null;
}

export function findDeliveryForOrder(orderId: number): DeliveryDetail | null {
  return allDeliveries().find((row) => row.order_id === orderId) ?? null;
}

export function patchDelivery(
  deliveryId: number,
  patch: Partial<DeliveryDetail>,
): void {
  const key = String(deliveryId);
  update((current) => ({
    ...current,
    deliveries: {
      ...current.deliveries,
      [key]: { ...current.deliveries[key], ...patch },
    },
  }));
}

/* ---------------------------------------------------------------- refunds */

export function allRefunds(): readonly RefundRead[] {
  const patches = load().refunds;
  return SEED_REFUNDS.map((refund) => {
    const patch = patches[String(refund.id)];
    return patch === undefined ? refund : { ...refund, ...patch };
  });
}

export function findRefund(refundId: number): RefundRead | null {
  return allRefunds().find((row) => row.id === refundId) ?? null;
}

export function patchRefund(refundId: number, patch: Partial<RefundRead>): void {
  const key = String(refundId);
  update((current) => ({
    ...current,
    refunds: { ...current.refunds, [key]: { ...current.refunds[key], ...patch } },
  }));
}

/* ----------------------------------------------------------------- events */

/** The seeded trail plus anything the console has recorded since. */
export function eventsFor(orderId: number): readonly OrderEventRead[] {
  const key = String(orderId);
  return [...(SEED_EVENTS[key] ?? []), ...(load().events[key] ?? [])];
}

export function appendEvent(
  orderId: number,
  build: (id: number) => OrderEventRead,
): OrderEventRead {
  const key = String(orderId);
  const event = build(load().nextEventId);
  update((current) => ({
    ...current,
    events: { ...current.events, [key]: [...(current.events[key] ?? []), event] },
    nextEventId: current.nextEventId + 1,
  }));
  return event;
}

/* --------------------------------------------------------------- settings */

export function readSettings(): PlatformSettings {
  return load().settings ?? SEED_SETTINGS;
}

export function writeSettings(next: PlatformSettings): PlatformSettings {
  update((current) => ({ ...current, settings: next }));
  return next;
}

export function clearSettings(): PlatformSettings {
  update((current) => ({ ...current, settings: null }));
  return SEED_SETTINGS;
}

/* ------------------------------------------------------------------ reset */

/** Throws away everything this browser changed. The JSON seed is untouched. */
export function resetOverlay(): void {
  commit(EMPTY);
}

/** True when the reader is looking at edited data, so the shell can say so. */
export function hasLocalChanges(): boolean {
  const current = load();
  return (
    Object.keys(current.restaurants).length > 0 ||
    Object.keys(current.customers).length > 0 ||
    Object.keys(current.coupons).length > 0 ||
    current.newCoupons.length > 0 ||
    Object.keys(current.deliveries).length > 0 ||
    Object.keys(current.refunds).length > 0 ||
    Object.keys(current.events).length > 0 ||
    current.settings !== null
  );
}
