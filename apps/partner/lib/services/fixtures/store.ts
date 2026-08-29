/**
 * The fixture source's memory: the JSON seed, shifted onto today, plus every
 * change this browser has made on top of it.
 *
 * Two halves, and the split is the whole design:
 *
 *  - **The seed** is read once, rebased from its anchor date onto the tablet's
 *    today, and never mutated. It is the same for everybody.
 *  - **The overlay** holds only what somebody changed here — a ticket accepted,
 *    a price edited, a coupon switched off. It is kept in `localStorage`, so an
 *    order accepted before a reload is still accepted after it.
 *
 * Reads merge the two, overlay winning. That is why the overlay can be small:
 * it stores diffs, not a copy of a megabyte of JSON.
 *
 * Not React state. Services are plain async functions that must work when
 * called from anywhere; `lib/queries/*` re-reads through TanStack Query, and
 * that is what makes a write show up on screen.
 */
import { omit } from "../../omit";
import type {
  Coupon,
  MenuCategory,
  MenuItem,
  ModifierGroup,
  Offer,
  Order,
  OrderDetail,
  OrderEvent,
  Permission,
  Profile,
  RestaurantApplication,
  RestaurantDetail,
  Settlement,
  StaffMember,
} from "../../types";

import accountsSeed from "./data/accounts.json";
import customersSeed from "./data/customers.json";
import menuSeed from "./data/menu.json";
import metaSeed from "./data/meta.json";
import modifiersSeed from "./data/modifiers.json";
import offersSeed from "./data/offers.json";
import orderDetailsSeed from "./data/order-details.json";
import orderEventsSeed from "./data/order-events.json";
import ordersSeed from "./data/orders.json";
import restaurantsSeed from "./data/restaurants.json";
import settlementsSeed from "./data/settlements.json";
import staffSeed from "./data/staff.json";

const STORAGE_KEY = "foodishi.partner.fixtures.v1";
const MS_PER_DAY = 86_400_000;

/* ── Accounts ──────────────────────────────────────────────────────────── */

/**
 * A seeded sign-in.
 *
 * The password is in the JSON, in plain text, because there is no auth server
 * to check it against — the fixture source is a drawing of a backend, not one.
 * When `NEXT_PUBLIC_DATA_SOURCE=api` this file is not even reached: sign-in is
 * Supabase and nothing here is consulted. Never put a real credential in the
 * seed.
 */
export interface FixtureAccount extends Profile {
  readonly password: string;
}

/**
 * An application, plus the one field the wire shape does not carry.
 *
 * `ApplicationRead` deliberately omits the applicant: the API reads that from
 * the bearer token, so telling the client whose row it is would be telling it
 * something it cannot use. The fixture source has no token, so it has to
 * remember — and this is the seam where that difference lives, rather than in a
 * wire type that would then be wrong about the API.
 */
export interface StoredApplication extends RestaurantApplication {
  readonly applicant_user_id: number;
}

/** Metadata for one payout. Its money is computed, never stored. */
export interface SettlementSeed {
  readonly id: number;
  readonly restaurant_id: number;
  readonly reference: string;
  readonly period_from_offset: number;
  readonly period_to_offset: number;
  readonly status: Settlement["status"];
  readonly paid_at_offset: number | null;
  readonly account_last4: string;
  readonly commission_percent: string;
}

/* ── Rebasing the seed onto today ──────────────────────────────────────── */

interface Meta {
  readonly anchor_date: string;
  readonly history_days: number;
}

const META = metaSeed as Meta;

/**
 * Whole days from the seed's anchor to the tablet's today.
 *
 * Whole days, not an arbitrary offset: a 21:04 ticket has to stay a 21:04
 * ticket, and "orders per day" has to keep meaning a day. Computed from local
 * midnights and rounded, so a tablet in a timezone that observes DST cannot
 * drift the seed by an hour into the previous day.
 */
function dayShiftMs(): number {
  const [year, month, day] = META.anchor_date.split("-").map(Number);
  const anchor = new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - anchor) / MS_PER_DAY) * MS_PER_DAY;
}

let shiftMs: number | null = null;

function shift(): number {
  // Computed on first read rather than at module load: this module is imported
  // during a server render too, and the date that matters is the tablet's.
  if (shiftMs === null) shiftMs = dayShiftMs();
  return shiftMs;
}

/** Moves one ISO instant onto today's copy of the seed's calendar. */
function shiftIso(iso: string): string {
  return new Date(new Date(iso).getTime() + shift()).toISOString();
}

function shiftMaybe(iso: string | null): string | null {
  return iso === null ? null : shiftIso(iso);
}

/** A local calendar day `offset` days from today, as "2026-08-21". */
export function dayOffsetToDate(offset: number): string {
  const at = new Date();
  at.setHours(0, 0, 0, 0);
  at.setDate(at.getDate() + offset);
  return toLocalDate(at.getTime());
}

/** The local calendar day an instant falls on. Never a UTC slice of the ISO. */
export function toLocalDate(at: number | string): string {
  const date = typeof at === "number" ? new Date(at) : new Date(at);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function rebaseOrder<T extends Order>(order: T): T {
  return {
    ...order,
    placed_at: shiftIso(order.placed_at),
    promised_at: shiftIso(order.promised_at),
    cancellable_until: shiftIso(order.cancellable_until),
    cancelled_at: shiftMaybe(order.cancelled_at),
    delivered_at: shiftMaybe(order.delivered_at),
  };
}

/* ── The seed, read once ───────────────────────────────────────────────── */

const SEED_ACCOUNTS = accountsSeed as readonly FixtureAccount[];
const SEED_RESTAURANTS = restaurantsSeed as unknown as Readonly<
  Record<string, RestaurantDetail>
>;
const SEED_MENU = menuSeed as unknown as Readonly<Record<string, readonly MenuCategory[]>>;
const SEED_MODIFIERS = modifiersSeed as unknown as readonly ModifierGroup[];
const SEED_OFFERS = offersSeed as unknown as {
  readonly offers: readonly Offer[];
  readonly coupons: readonly Coupon[];
};
const SEED_SETTLEMENTS = settlementsSeed as unknown as readonly SettlementSeed[];
const SEED_CUSTOMERS = customersSeed as unknown as {
  readonly users: readonly { readonly id: number }[];
  readonly addresses: readonly { readonly id: number }[];
};

const SEED_STAFF: Readonly<Record<string, readonly StaffMember[]>> = Object.fromEntries(
  Object.entries(staffSeed as unknown as Record<string, readonly StaffMember[]>).map(
    ([restaurantId, rows]) => [
      restaurantId,
      rows.map((row) => ({
        ...row,
        created_at: shiftIso(row.created_at),
        updated_at: shiftIso(row.updated_at),
        granted: row.granted as readonly Permission[],
      })),
    ],
  ),
);

const SEED_ORDERS: readonly Order[] = (ordersSeed as unknown as readonly Order[]).map(
  rebaseOrder,
);

const SEED_DETAILS: Readonly<Record<string, OrderDetail>> = Object.fromEntries(
  Object.entries(orderDetailsSeed as unknown as Record<string, OrderDetail>).map(
    ([id, order]) => [id, rebaseOrder(order)],
  ),
);

const SEED_EVENTS: Readonly<Record<string, readonly OrderEvent[]>> = Object.fromEntries(
  Object.entries(orderEventsSeed as unknown as Record<string, readonly OrderEvent[]>).map(
    ([id, trail]) => [id, trail.map((event) => ({ ...event, created_at: shiftIso(event.created_at) }))],
  ),
);

/** Every dish in the seed, flat. The menu is rebuilt from this, not from it. */
const SEED_ITEMS: readonly MenuItem[] = Object.values(SEED_MENU).flatMap((categories) =>
  categories.flatMap((category) => category.items),
);

/** Categories without their dishes — the dishes are merged in on read. */
const SEED_CATEGORIES: readonly Omit<MenuCategory, "items">[] = Object.values(SEED_MENU)
  .flat()
  .map((category) => omit(category, "items"));

/* ── The overlay ───────────────────────────────────────────────────────── */

/** Sequences, so nothing this browser creates can collide with the seed. */
type Sequence =
  | "order"
  | "orderItem"
  | "event"
  | "category"
  | "item"
  | "group"
  | "option"
  | "staff"
  | "offer"
  | "coupon"
  | "application"
  | "account";

function nextFrom(...values: readonly number[]): number {
  return Math.max(0, ...values) + 1;
}

const FIRST_ID: Readonly<Record<Sequence, number>> = {
  order: nextFrom(...SEED_ORDERS.map((order) => order.id)),
  orderItem: nextFrom(
    ...Object.values(SEED_DETAILS).flatMap((order) => order.items.map((line) => line.id)),
  ),
  event: nextFrom(
    ...Object.values(SEED_EVENTS).flatMap((trail) => trail.map((event) => event.id)),
  ),
  category: nextFrom(...SEED_CATEGORIES.map((category) => category.id)),
  item: nextFrom(...SEED_ITEMS.map((item) => item.id)),
  group: nextFrom(...SEED_MODIFIERS.map((entry) => entry.id)),
  option: nextFrom(
    ...SEED_MODIFIERS.flatMap((entry) => entry.options.map((option) => option.id)),
  ),
  staff: nextFrom(...Object.values(SEED_STAFF).flat().map((row) => row.id)),
  offer: nextFrom(...SEED_OFFERS.offers.map((offer) => offer.id)),
  coupon: nextFrom(...SEED_OFFERS.coupons.map((coupon) => coupon.id)),
  // Nothing seeds either of these: an application and a self-signed-up account
  // only ever exist because somebody created one here. nextFrom() over nothing
  // is 1.
  application: nextFrom(),
  account: nextFrom(...SEED_ACCOUNTS.map((account) => account.id)),
};

interface Overlay {
  /** Which seeded account is signed in on this tablet, if any. */
  readonly sessionUserId: number | null;
  /** Only for accounts whose password was changed here. */
  readonly passwords: Readonly<Record<string, string>>;
  readonly profiles: Readonly<Record<string, Partial<Profile>>>;
  /** Whole replacement rows, seeded or created. */
  readonly orders: Readonly<Record<string, OrderDetail>>;
  readonly events: Readonly<Record<string, readonly OrderEvent[]>>;
  readonly categories: Readonly<Record<string, Omit<MenuCategory, "items">>>;
  readonly deletedCategories: readonly number[];
  readonly items: Readonly<Record<string, MenuItem>>;
  readonly deletedItems: readonly number[];
  readonly groups: Readonly<Record<string, ModifierGroup>>;
  readonly deletedGroups: readonly number[];
  readonly restaurants: Readonly<Record<string, Partial<RestaurantDetail>>>;
  readonly staff: Readonly<Record<string, StaffMember>>;
  readonly deletedStaff: readonly number[];
  readonly offers: Readonly<Record<string, Offer>>;
  readonly deletedOffers: readonly number[];
  readonly coupons: Readonly<Record<string, Coupon>>;
  readonly deletedCoupons: readonly number[];
  /** Applications sent from this browser. Nothing seeds one. */
  readonly applications: Readonly<Record<string, StoredApplication>>;
  /**
   * Accounts created here, by somebody applying to join. Whole rows rather than
   * patches: these have no seeded original to be a diff against.
   */
  readonly createdAccounts: Readonly<Record<string, FixtureAccount>>;
  readonly sequences: Readonly<Record<string, number>>;
}

const EMPTY: Overlay = {
  sessionUserId: null,
  passwords: {},
  profiles: {},
  orders: {},
  events: {},
  categories: {},
  deletedCategories: [],
  items: {},
  deletedItems: [],
  groups: {},
  deletedGroups: [],
  restaurants: {},
  staff: {},
  deletedStaff: [],
  offers: {},
  deletedOffers: [],
  coupons: {},
  deletedCoupons: [],
  applications: {},
  createdAccounts: {},
  sequences: {},
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
    if (raw !== null) overlay = { ...EMPTY, ...(JSON.parse(raw) as Partial<Overlay>) };
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

function update(next: (current: Overlay) => Overlay): Overlay {
  const updated = next(load());
  commit(updated);
  return updated;
}

/** The next id for one entity. Always above every seeded id. */
export function takeId(sequence: Sequence): number {
  const key = sequence;
  const current = load();
  const value = current.sequences[key] ?? FIRST_ID[sequence];
  commit({ ...current, sequences: { ...current.sequences, [key]: value + 1 } });
  return value;
}

/** Wipes only what this browser changed. The JSON seed is untouched. */
export function resetFixtures(): void {
  commit(EMPTY);
}

/* ── Session ───────────────────────────────────────────────────────────── */

export function listAccounts(): readonly FixtureAccount[] {
  const current = load();
  const seeded = SEED_ACCOUNTS.map((account) => ({
    ...account,
    ...current.profiles[String(account.id)],
    password: current.passwords[String(account.id)] ?? account.password,
  }));
  // Accounts created in this browser sit alongside the seeded ones and go
  // through the same profile and password overlays, so somebody who applies to
  // join can sign back in afterwards exactly as a seeded restaurateur does.
  const created = Object.values(current.createdAccounts).map((account) => ({
    ...account,
    ...current.profiles[String(account.id)],
    password: current.passwords[String(account.id)] ?? account.password,
  }));
  return [...seeded, ...created];
}

/**
 * Register a new account. Refuses a duplicate address by answering null, so the
 * caller reports it the way the API's unique index makes it report.
 */
export function createAccount(details: {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly city: string;
  readonly password: string;
}): FixtureAccount | null {
  const email = details.email.trim().toLowerCase();
  if (findAccountByEmail(email) !== null) return null;
  const account: FixtureAccount = {
    id: takeId("account"),
    name: details.name,
    email,
    phone: details.phone,
    city: details.city,
    avatar_url: null,
    password: details.password,
  };
  update((current) => ({
    ...current,
    createdAccounts: {
      ...current.createdAccounts,
      [String(account.id)]: account,
    },
  }));
  return account;
}

export function findAccountByEmail(email: string): FixtureAccount | null {
  const wanted = email.trim().toLowerCase();
  return listAccounts().find((account) => account.email.toLowerCase() === wanted) ?? null;
}

export function findAccount(userId: number): FixtureAccount | null {
  return listAccounts().find((account) => account.id === userId) ?? null;
}

export function readSessionUserId(): number | null {
  return load().sessionUserId;
}

export function writeSessionUserId(userId: number | null): void {
  update((current) => ({ ...current, sessionUserId: userId }));
}

export function writeProfilePatch(userId: number, patch: Partial<Profile>): void {
  update((current) => ({
    ...current,
    profiles: {
      ...current.profiles,
      [String(userId)]: { ...current.profiles[String(userId)], ...patch },
    },
  }));
}

export function writePassword(userId: number, password: string): void {
  update((current) => ({
    ...current,
    passwords: { ...current.passwords, [String(userId)]: password },
  }));
}

/* ── Applications to join ──────────────────────────────────────────────── */

/** One applicant's own applications. Pending first, then newest. */
export function applicationsFor(
  userId: number,
): readonly RestaurantApplication[] {
  return Object.values(load().applications)
    .filter((application) => application.applicant_user_id === userId)
    .sort((left, right) => {
      const pending = Number(right.status === "pending") - Number(left.status === "pending");
      return pending !== 0 ? pending : right.created_at.localeCompare(left.created_at);
    });
}

/** Whether a slug is already spoken for, by a restaurant or a pending request. */
export function isSlugTaken(slug: string): boolean {
  const wanted = slug.trim().toLowerCase();
  return (
    allRestaurants().some((restaurant) => restaurant.slug === wanted) ||
    Object.values(load().applications).some(
      (application) => application.slug === wanted && application.status === "pending",
    )
  );
}

export function writeApplication(application: StoredApplication): void {
  update((current) => ({
    ...current,
    applications: {
      ...current.applications,
      [String(application.id)]: application,
    },
  }));
}

/* ── Restaurants ───────────────────────────────────────────────────────── */

export function allRestaurants(): readonly RestaurantDetail[] {
  const current = load();
  return Object.entries(SEED_RESTAURANTS).map(([id, restaurant]) => ({
    ...restaurant,
    ...current.restaurants[id],
  }));
}

export function findRestaurant(restaurantId: number): RestaurantDetail | null {
  return allRestaurants().find((restaurant) => restaurant.id === restaurantId) ?? null;
}

export function writeRestaurant(
  restaurantId: number,
  patch: Partial<RestaurantDetail>,
): void {
  update((current) => ({
    ...current,
    restaurants: {
      ...current.restaurants,
      [String(restaurantId)]: { ...current.restaurants[String(restaurantId)], ...patch },
    },
  }));
}

/* ── Staff ─────────────────────────────────────────────────────────────── */

export function allStaff(): readonly StaffMember[] {
  const current = load();
  const removed = new Set(current.deletedStaff);
  const seeded = Object.values(SEED_STAFF)
    .flat()
    .map((row) => current.staff[String(row.id)] ?? row);
  const created = Object.values(current.staff).filter(
    (row) => !seeded.some((seed) => seed.id === row.id),
  );
  return [...seeded, ...created].filter((row) => !removed.has(row.id));
}

export function staffFor(restaurantId: number): readonly StaffMember[] {
  return allStaff().filter((row) => row.restaurant_id === restaurantId);
}

export function findStaff(staffId: number): StaffMember | null {
  return allStaff().find((row) => row.id === staffId) ?? null;
}

export function writeStaff(row: StaffMember): void {
  update((current) => ({
    ...current,
    staff: { ...current.staff, [String(row.id)]: row },
  }));
}

export function deleteStaff(staffId: number): void {
  update((current) => ({
    ...current,
    deletedStaff: [...current.deletedStaff, staffId],
  }));
}

/* ── Menu ──────────────────────────────────────────────────────────────── */

export function allMenuItems(): readonly MenuItem[] {
  const current = load();
  const removed = new Set(current.deletedItems);
  const seeded = SEED_ITEMS.map((item) => current.items[String(item.id)] ?? item);
  const created = Object.values(current.items).filter(
    (item) => !SEED_ITEMS.some((seed) => seed.id === item.id),
  );
  return [...seeded, ...created].filter((item) => !removed.has(item.id));
}

export function findMenuItem(itemId: number): MenuItem | null {
  return allMenuItems().find((item) => item.id === itemId) ?? null;
}

export function writeMenuItem(item: MenuItem): void {
  update((current) => ({
    ...current,
    items: { ...current.items, [String(item.id)]: item },
  }));
}

export function deleteMenuItem(itemId: number): void {
  update((current) => ({
    ...current,
    deletedItems: [...current.deletedItems, itemId],
  }));
}

function allCategoryRows(): readonly Omit<MenuCategory, "items">[] {
  const current = load();
  const removed = new Set(current.deletedCategories);
  const seeded = SEED_CATEGORIES.map(
    (category) => current.categories[String(category.id)] ?? category,
  );
  const created = Object.values(current.categories).filter(
    (category) => !SEED_CATEGORIES.some((seed) => seed.id === category.id),
  );
  return [...seeded, ...created].filter((category) => !removed.has(category.id));
}

export function findCategory(categoryId: number): Omit<MenuCategory, "items"> | null {
  return allCategoryRows().find((category) => category.id === categoryId) ?? null;
}

/** The menu as the catalogue serves it: categories in order, dishes inside. */
export function menuFor(restaurantId: number): readonly MenuCategory[] {
  const items = allMenuItems();
  return allCategoryRows()
    .filter((category) => category.restaurant_id === restaurantId)
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((category) => ({
      ...category,
      items: items
        .filter((item) => item.category_id === category.id)
        .sort((left, right) => left.id - right.id),
    }));
}

export function writeCategory(category: Omit<MenuCategory, "items">): void {
  update((current) => ({
    ...current,
    categories: { ...current.categories, [String(category.id)]: category },
  }));
}

export function deleteCategory(categoryId: number): void {
  update((current) => ({
    ...current,
    deletedCategories: [...current.deletedCategories, categoryId],
  }));
}

/* ── Modifier groups ───────────────────────────────────────────────────── */

export function allModifierGroups(): readonly ModifierGroup[] {
  const current = load();
  const removed = new Set(current.deletedGroups);
  const seeded = SEED_MODIFIERS.map((group) => current.groups[String(group.id)] ?? group);
  const created = Object.values(current.groups).filter(
    (group) => !SEED_MODIFIERS.some((seed) => seed.id === group.id),
  );
  return [...seeded, ...created].filter((group) => !removed.has(group.id));
}

export function findModifierGroup(groupId: number): ModifierGroup | null {
  return allModifierGroups().find((group) => group.id === groupId) ?? null;
}

export function writeModifierGroup(group: ModifierGroup): void {
  update((current) => ({
    ...current,
    groups: { ...current.groups, [String(group.id)]: group },
  }));
}

export function deleteModifierGroup(groupId: number): void {
  update((current) => ({
    ...current,
    deletedGroups: [...current.deletedGroups, groupId],
  }));
}

/* ── Orders ────────────────────────────────────────────────────────────── */

/** Seed plus overlay, newest first. The overlay wins on a shared id. */
export function allOrders(): readonly OrderDetail[] {
  const current = load();
  const seeded = SEED_ORDERS.map(
    (row) => current.orders[String(row.id)] ?? SEED_DETAILS[String(row.id)],
  ).filter((row): row is OrderDetail => row !== undefined);
  const created = Object.values(current.orders).filter(
    (row) => !SEED_DETAILS[String(row.id)],
  );
  return [...created, ...seeded].sort(
    (left, right) =>
      new Date(right.placed_at).getTime() - new Date(left.placed_at).getTime(),
  );
}

export function ordersFor(restaurantId: number): readonly OrderDetail[] {
  return allOrders().filter((order) => order.restaurant_id === restaurantId);
}

export function findOrder(orderId: number): OrderDetail | null {
  return allOrders().find((order) => order.id === orderId) ?? null;
}

export function writeOrder(order: OrderDetail): void {
  update((current) => ({
    ...current,
    orders: { ...current.orders, [String(order.id)]: order },
  }));
}

export function eventsFor(orderId: number): readonly OrderEvent[] {
  const key = String(orderId);
  return load().events[key] ?? SEED_EVENTS[key] ?? [];
}

export function appendEvent(orderId: number, event: OrderEvent): void {
  const key = String(orderId);
  update((current) => ({
    ...current,
    events: {
      ...current.events,
      [key]: [...(current.events[key] ?? SEED_EVENTS[key] ?? []), event],
    },
  }));
}

/* ── Customers ─────────────────────────────────────────────────────────── */

export function seedCustomers(): typeof SEED_CUSTOMERS {
  return SEED_CUSTOMERS;
}

/* ── Offers, coupons, settlements ──────────────────────────────────────── */

export function allOffers(): readonly Offer[] {
  const current = load();
  const removed = new Set(current.deletedOffers);
  const seeded = SEED_OFFERS.offers.map(
    (offer) => current.offers[String(offer.id)] ?? offer,
  );
  const created = Object.values(current.offers).filter(
    (offer) => !SEED_OFFERS.offers.some((seed) => seed.id === offer.id),
  );
  return [...seeded, ...created].filter((offer) => !removed.has(offer.id));
}

export function findOffer(offerId: number): Offer | null {
  return allOffers().find((offer) => offer.id === offerId) ?? null;
}

export function writeOffer(offer: Offer): void {
  update((current) => ({
    ...current,
    offers: { ...current.offers, [String(offer.id)]: offer },
  }));
}

export function deleteOffer(offerId: number): void {
  update((current) => ({
    ...current,
    deletedOffers: [...current.deletedOffers, offerId],
  }));
}

export function allCoupons(): readonly Coupon[] {
  const current = load();
  const removed = new Set(current.deletedCoupons);
  const seeded = SEED_OFFERS.coupons.map(
    (coupon) => current.coupons[String(coupon.id)] ?? coupon,
  );
  const created = Object.values(current.coupons).filter(
    (coupon) => !SEED_OFFERS.coupons.some((seed) => seed.id === coupon.id),
  );
  return [...seeded, ...created].filter((coupon) => !removed.has(coupon.id));
}

export function findCoupon(couponId: number): Coupon | null {
  return allCoupons().find((coupon) => coupon.id === couponId) ?? null;
}

export function writeCoupon(coupon: Coupon): void {
  update((current) => ({
    ...current,
    coupons: { ...current.coupons, [String(coupon.id)]: coupon },
  }));
}

export function deleteCoupon(couponId: number): void {
  update((current) => ({
    ...current,
    deletedCoupons: [...current.deletedCoupons, couponId],
  }));
}

export function settlementSeedsFor(restaurantId: number): readonly SettlementSeed[] {
  return SEED_SETTLEMENTS.filter((row) => row.restaurant_id === restaurantId);
}

/** The commission this restaurant is on, from its newest payout row. */
export function commissionPercentFor(restaurantId: number): string {
  const rows = settlementSeedsFor(restaurantId);
  return rows[rows.length - 1]?.commission_percent ?? "18.00";
}
