/**
 * What the partner console needs from a backend, stated once.
 *
 * Two implementations satisfy it: `fixtures/` reads bundled JSON, `api/` calls
 * the Foodishi FastAPI service through @repo/api-client. Every screen, hook and
 * query key in this app depends on THIS FILE and never on either one, so moving
 * the console onto the real backend is a single line in ./index.ts.
 *
 * Read the interface as a specification of the backend still to be built. Six
 * of the eight services below already have routes; `offers`, `reports` and
 * `payments` do not, and `api/` says so out loud with a refusal that names the
 * missing endpoint rather than returning an empty list that would read as "no
 * offers" instead of "no such route".
 *
 * Conventions, held by both implementations:
 *  - Money is a decimal string, in and out. Never a float.
 *  - Ids are numbers. The route/key that carries one may be a string; the
 *    shape is not.
 *  - A refusal is thrown, never returned. It carries `status` and `detail`, so
 *    @repo/api-client's `toUserMessage` prints a fixture refusal and a real 403
 *    through exactly the same path.
 *  - Nothing takes an identity argument. Both sources know who is signed in —
 *    the API from its bearer token, the fixtures from their own session — and a
 *    caller who could name someone else could act as them.
 */
import type {
  Address,
  CancelResult,
  Coupon,
  CouponCreate,
  CouponPatch,
  Customer,
  EarningsSummary,
  LedgerEntry,
  Membership,
  MenuCategory,
  MenuItem,
  MenuItemCreate,
  MenuItemPatch,
  ModifierGroup,
  ModifierKind,
  ModifierOption,
  Offer,
  OfferCreate,
  OfferPatch,
  Order,
  OrderClock,
  OrderDetail,
  OrderEvent,
  OrderStatus,
  OrdersPage,
  Page,
  Permission,
  PerformanceReport,
  PopularItem,
  Profile,
  ReportWindow,
  RestaurantDetail,
  RestaurantPatch,
  RestaurantPolicy,
  SalesDay,
  Settlement,
  StaffMember,
  StaffRole,
} from "../types";

/* ── Identity ──────────────────────────────────────────────────────────── */

/** Who is signed in, and nothing that could be used to become them. */
export interface AuthState {
  readonly profile: Profile;
  /** Every restaurant this account may act for, with its role and grants. */
  readonly memberships: readonly Membership[];
}

export interface PasswordChange {
  readonly currentPassword: string;
  readonly newPassword: string;
}

export type ProfilePatch = Partial<
  Pick<Profile, "name" | "phone" | "city" | "avatar_url">
>;

export interface IdentityService {
  /**
   * The session this browser already has, or null. Never throws for "signed
   * out" — that is an answer, not a failure.
   */
  getAuthState(): Promise<AuthState | null>;
  signIn(email: string, password: string): Promise<AuthState>;
  signOut(): Promise<void>;
  updateMyProfile(patch: ProfilePatch): Promise<Profile>;
  /**
   * The current password is required and checked. A console that could reset a
   * password from an unlocked tablet is a console that hands the restaurant to
   * whoever walks past it.
   */
  changeMyPassword(change: PasswordChange): Promise<void>;
}

/* ── Orders ────────────────────────────────────────────────────────────── */

export interface OrderQuery {
  readonly restaurantId: number;
  /** Everything neither delivered nor cancelled. */
  readonly live?: boolean;
  readonly status?: OrderStatus;
  /** Inclusive ISO instant. */
  readonly placedFrom?: string;
  /** Exclusive ISO instant. */
  readonly placedTo?: string;
  /** An order id, or part of a customer's name. */
  readonly q?: string;
  readonly limit: number;
  readonly offset: number;
}

export interface StatusChange {
  readonly orderId: number;
  readonly status: OrderStatus;
}

export interface RefuseOrder {
  readonly orderId: number;
  readonly reason: string;
}

export interface OrdersService {
  list(query: OrderQuery, signal?: AbortSignal): Promise<OrdersPage>;
  get(orderId: number, signal?: AbortSignal): Promise<OrderDetail>;
  getClock(orderId: number, signal?: AbortSignal): Promise<OrderClock>;
  listEvents(orderId: number, signal?: AbortSignal): Promise<readonly OrderEvent[]>;
  /** Accept, start preparing, mark ready, hand over, mark delivered. */
  updateStatus(change: StatusChange): Promise<Order>;
  /** The kitchen's "no" to a ticket it never accepted. Pending orders only. */
  reject(input: RefuseOrder): Promise<CancelResult>;
  /** Dropping a ticket the kitchen had already taken on. */
  cancel(input: RefuseOrder): Promise<CancelResult>;
  /**
   * The customer behind a ticket. Both of these are the customer's own data and
   * the API refuses them to a restaurant with a 403 — which is a designed
   * boundary, not a bug, so the screens draw the refusal quietly.
   */
  getCustomer(userId: number, signal?: AbortSignal): Promise<Customer>;
  getAddress(addressId: number, signal?: AbortSignal): Promise<Address>;
}

/* ── Menu ──────────────────────────────────────────────────────────────── */

export interface CategoryInput {
  readonly restaurantId: number;
  readonly name: string;
}

export interface CategoryRename {
  readonly categoryId: number;
  readonly name: string;
}

export interface AvailabilityChange {
  readonly itemId: number;
  readonly isAvailable: boolean;
}

export interface ModifierGroupInput {
  readonly restaurantId: number;
  readonly name: string;
  readonly kind: ModifierKind;
  readonly minSelect: number;
  readonly maxSelect: number;
  readonly menuItemIds: readonly number[];
}

export interface ModifierOptionInput {
  readonly groupId: number;
  readonly name: string;
  readonly priceDelta: string;
}

export interface MenuService {
  getMenu(restaurantId: number, signal?: AbortSignal): Promise<readonly MenuCategory[]>;
  createCategory(input: CategoryInput): Promise<MenuCategory>;
  renameCategory(input: CategoryRename): Promise<MenuCategory>;
  /** Refused for a category that still holds dishes — move them first. */
  deleteCategory(categoryId: number): Promise<void>;
  createItem(body: MenuItemCreate): Promise<MenuItem>;
  updateItem(itemId: number, patch: MenuItemPatch): Promise<MenuItem>;
  setAvailability(change: AvailabilityChange): Promise<MenuItem>;
  /** Refused for a dish that has ever been ordered — receipts keep the link. */
  deleteItem(itemId: number): Promise<void>;
  listModifierGroups(
    restaurantId: number,
    signal?: AbortSignal,
  ): Promise<readonly ModifierGroup[]>;
  createModifierGroup(input: ModifierGroupInput): Promise<ModifierGroup>;
  updateModifierGroup(
    groupId: number,
    patch: Partial<ModifierGroupInput>,
  ): Promise<ModifierGroup>;
  deleteModifierGroup(groupId: number): Promise<void>;
  addModifierOption(input: ModifierOptionInput): Promise<ModifierOption>;
  updateModifierOption(
    optionId: number,
    patch: Partial<Omit<ModifierOption, "id" | "group_id">>,
  ): Promise<ModifierOption>;
  removeModifierOption(optionId: number): Promise<void>;
}

/* ── Restaurant ────────────────────────────────────────────────────────── */

export interface RestaurantService {
  get(restaurantId: number, signal?: AbortSignal): Promise<RestaurantDetail>;
  getPolicy(restaurantId: number, signal?: AbortSignal): Promise<RestaurantPolicy>;
  update(restaurantId: number, patch: RestaurantPatch): Promise<RestaurantDetail>;
  /**
   * Stop or start taking orders, right now. Its own call rather than a field on
   * the patch above: a customer feels this one immediately, so closing must be
   * deliberate and never a side effect of saving a phone number.
   */
  setAcceptingOrders(restaurantId: number, isActive: boolean): Promise<RestaurantDetail>;
}

/* ── Staff ─────────────────────────────────────────────────────────────── */

export interface StaffInvite {
  readonly restaurantId: number;
  readonly email: string;
  readonly role: StaffRole;
}

export interface StaffService {
  list(restaurantId: number, signal?: AbortSignal): Promise<Page<StaffMember>>;
  add(invite: StaffInvite): Promise<StaffMember>;
  setRole(staffId: number, role: StaffRole): Promise<StaffMember>;
  /** Revoke keeps the record and takes the access away. */
  setActive(staffId: number, isActive: boolean): Promise<StaffMember>;
  /** Replaces the whole grant list, so a removed tick is a real removal. */
  setPermissions(
    staffId: number,
    granted: readonly Permission[],
  ): Promise<StaffMember>;
  /**
   * Send a fresh sign-in link and invalidate the sessions this person has open.
   * Answers the address it went to, which is the only confirmation a manager
   * standing at a tablet can act on.
   */
  resetAccess(staffId: number): Promise<{ readonly email: string }>;
  /** Deletes the membership outright, for a row added by mistake. */
  remove(staffId: number): Promise<void>;
}

/* ── Offers ────────────────────────────────────────────────────────────── */

export interface OffersService {
  listOffers(restaurantId: number, signal?: AbortSignal): Promise<readonly Offer[]>;
  createOffer(restaurantId: number, body: OfferCreate): Promise<Offer>;
  updateOffer(offerId: number, patch: OfferPatch): Promise<Offer>;
  deleteOffer(offerId: number): Promise<void>;
  listCoupons(restaurantId: number, signal?: AbortSignal): Promise<readonly Coupon[]>;
  createCoupon(restaurantId: number, body: CouponCreate): Promise<Coupon>;
  updateCoupon(couponId: number, patch: CouponPatch): Promise<Coupon>;
  deleteCoupon(couponId: number): Promise<void>;
}

/* ── Reports ───────────────────────────────────────────────────────────── */

export interface ReportsService {
  /** One row per calendar day in the window, oldest first. */
  sales(
    restaurantId: number,
    window: ReportWindow,
    signal?: AbortSignal,
  ): Promise<readonly SalesDay[]>;
  popularItems(
    restaurantId: number,
    window: ReportWindow,
    signal?: AbortSignal,
  ): Promise<readonly PopularItem[]>;
  performance(
    restaurantId: number,
    window: ReportWindow,
    signal?: AbortSignal,
  ): Promise<PerformanceReport>;
}

/* ── Payments ──────────────────────────────────────────────────────────── */

export interface PaymentsService {
  earnings(
    restaurantId: number,
    window: ReportWindow,
    signal?: AbortSignal,
  ): Promise<EarningsSummary>;
  settlements(
    restaurantId: number,
    signal?: AbortSignal,
  ): Promise<readonly Settlement[]>;
  ledger(
    restaurantId: number,
    limit: number,
    offset: number,
    signal?: AbortSignal,
  ): Promise<Page<LedgerEntry>>;
}

/* ── The whole thing ───────────────────────────────────────────────────── */

export interface PartnerServices {
  readonly identity: IdentityService;
  readonly orders: OrdersService;
  readonly menu: MenuService;
  readonly restaurant: RestaurantService;
  readonly staff: StaffService;
  readonly offers: OffersService;
  readonly reports: ReportsService;
  readonly payments: PaymentsService;
  /** Named in the dev banner and in refusals, so nobody debugs the wrong one. */
  readonly sourceName: "fixtures" | "api";
}
