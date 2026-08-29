/**
 * What the operator console needs from a backend, stated once.
 *
 * This is the seam. `lib/queries.ts` depends on the interfaces below and on
 * nothing else, so the console is UI-only today — `fixtures/` answers every
 * call out of the JSON in `./data` — and becomes backend-backed by writing one
 * more implementation and changing one line in ./index.ts. No page, hook or
 * query key moves.
 *
 * Two decisions worth knowing before reading further:
 *
 * Every shape that the FastAPI schema already defines is imported from
 * `../api-types` rather than redeclared. OrderDetail, PaymentRead, RefundRead,
 * CouponRead and the rest are the generated types, so a fixture that drifted
 * from the real response is a compile error rather than a runtime bug in one
 * screen. The shapes declared *here* are the ones the API has no name for yet:
 * platform settings, the commission ledger, the five reports, and the joins a
 * board needs. Each says so where it is defined.
 *
 * Writes are part of the interface, not an afterthought. Deactivating a
 * kitchen, editing its details, creating a coupon, retrying a refund and saving
 * the tax rate are the jobs on the operator's list; a console that could only
 * read would be a dashboard, not an operations tool. The fixture source
 * satisfies them against a local overlay — see fixtures/store.ts.
 */
import type { components } from "@repo/api-client";

type Schemas = components["schemas"];

import type {
  AddressRead,
  ApplicationStatus,
  DeliveryStatus,
  CouponRead,
  CouponScope,
  Cuisine,
  DeliveryDetail,
  DeliveryPartnerRead,
  DiscountType,
  OrderEventRead,
  OrderDetail,
  OrderFunnel,
  OrderRead,
  OrderStatus,
  OrdersOverTimePoint,
  Page,
  PaymentRead,
  PaymentStatus,
  PlatformSummary,
  RefundDetail,
  RefundRead,
  RefundStatus,
  RestaurantApplicationRow,
  RestaurantDetail,
  RestaurantMetrics,
  RestaurantSummary,
  UserRead,
} from "../api-types";

/* ------------------------------------------------------------------ paging */

/** Every list call takes the same window. `limit` is capped per service. */
export interface PageQuery {
  readonly limit: number;
  readonly offset: number;
}

/* ----------------------------------------------------------------- metrics */

/**
 * Where the work is, right now — one figure per section that has something to
 * say.
 *
 * This exists because the navigation is an instrument, not a menu. Twelve
 * sections and one operator: the question "where do I go next" has an answer in
 * the data, and a sidebar that made you click each section to find out was
 * asking you to poll it by hand.
 *
 * It is one call rather than six because it is read on every page in the
 * console. Six queries behind the chrome would mean the sidebar cost more than
 * the board it sits beside.
 *
 * Only the sections with a real figure are here. Overview, Orders, Customers,
 * Revenue, Reports and Settings are absent on purpose — a badge showing a
 * number nobody has to act on is noise that teaches the reader to ignore the
 * ones that matter.
 */
export interface Workload {
  /** Orders in flight, platform-wide. */
  readonly live_orders: number;
  /** Orders in flight that are already past the time the customer was told. */
  readonly orders_late: number;
  /** Rides still on the road, and how many of them are past the promise. */
  readonly deliveries_out: number;
  readonly deliveries_late: number;
  /** Kitchens whose real end-to-end time has drifted above the platform's. */
  readonly restaurants_slipping: number;
  /** Codes at their cap: still typed in at checkout, and refused. */
  readonly coupons_exhausted: number;
  /** Payment attempts that never went through. */
  readonly payments_failed: number;
  /** Refunds past the time the customer was promised their money. */
  readonly refunds_breached: number;
  /** What those refunds are worth — the money the platform is holding. */
  readonly refunds_owed: string;
  /**
   * Restaurants asking to join, still unanswered.
   *
   * The only figure here that cannot resolve itself. A late order becomes a
   * delivered one whether anybody looks or not; an application waits until a
   * person decides, which is exactly why it belongs in the chrome.
   */
  readonly applications_pending: number;
}

export interface MetricsService {
  /** The nine headline figures, plus the four the checklist adds. */
  getSummary(): Promise<PlatformSummary>;
  /** One figure per section that has something to say. Read on every page. */
  getWorkload(): Promise<Workload>;
  listOrdersOverTime(days: number): Promise<readonly OrdersOverTimePoint[]>;
  getFunnel(): Promise<OrderFunnel>;
  /** One row per kitchen that has taken an order. Never paged in practice. */
  listRestaurantMetrics(): Promise<Page<RestaurantMetrics>>;
}

/* --------------------------------------------------------------- catalogue */

/**
 * The fields an operator may edit on a kitchen.
 *
 * Deliberately narrower than the generated `RestaurantUpdate`: slug, latitude
 * and longitude are on that schema and are not on this form, because renaming
 * a slug breaks every customer link to the place and moving a pin is a
 * geocoding job rather than a text field. `is_active` is absent too — it has
 * its own call, so an accidental form submit can never switch a kitchen off.
 */
export interface RestaurantPatch {
  readonly name?: string;
  readonly description?: string | null;
  readonly city?: string;
  readonly area?: string;
  readonly address_line?: string;
  readonly phone?: string;
  readonly price_for_two?: string;
  readonly avg_prep_minutes?: number;
  readonly opens_at?: string;
  readonly closes_at?: string;
}

export interface CatalogService {
  /** The whole catalogue, active and deactivated alike. */
  listRestaurants(): Promise<Page<RestaurantSummary>>;
  getRestaurant(restaurantId: number): Promise<RestaurantDetail>;
  updateRestaurant(
    restaurantId: number,
    patch: RestaurantPatch,
  ): Promise<RestaurantDetail>;
  /** Switching a kitchen off stops new orders; its history is untouched. */
  setRestaurantActive(
    restaurantId: number,
    isActive: boolean,
  ): Promise<RestaurantDetail>;
  listCuisines(): Promise<readonly Cuisine[]>;
}

/* ----------------------------------------------------------------- people */

export interface CustomerQuery extends PageQuery {
  /** Matched against name, email and phone. Empty means no predicate. */
  readonly q: string;
  /** null means "either" — the filter is omitted entirely. */
  readonly isActive: boolean | null;
}

export interface PeopleService {
  listCustomers(query: CustomerQuery): Promise<Page<UserRead>>;
  getCustomer(userId: number): Promise<UserRead>;
  /** A deactivated account cannot sign in or order. History is kept. */
  setCustomerActive(userId: number, isActive: boolean): Promise<UserRead>;
  listAddresses(userId: number): Promise<readonly AddressRead[]>;
  /** A count, not rows: for the tile that states how many are switched off. */
  countCustomers(isActive: boolean | null): Promise<number>;
}

/* ----------------------------------------------------------------- orders */

export interface OrderQuery extends PageQuery {
  /** Order id, customer name or email, or kitchen name. */
  readonly q: string;
  /** null means every state. */
  readonly status: OrderStatus | null;
  readonly restaurantId: number | null;
  /** Only orders still in flight. Overrides `status` when true. */
  readonly liveOnly: boolean;
  /** Placed within this many days. 0 means no bound. */
  readonly withinDays: number;
  readonly sort: OrderSort;
}

/** What the orders board can be ordered by. Plain words live in the page. */
export type OrderSort = "newest" | "oldest" | "largest" | "latest_promise";

export interface OrdersService {
  listOrders(query: OrderQuery): Promise<Page<OrderRead>>;
  getOrder(orderId: number): Promise<OrderDetail>;
  listEvents(orderId: number): Promise<readonly OrderEventRead[]>;
  /** One customer's orders, newest first. Feeds the customer panel's totals. */
  listByCustomer(userId: number, query: PageQuery): Promise<Page<OrderRead>>;
  /** Null until a rider is assigned, which is the ordinary case before pickup. */
  getDelivery(orderId: number): Promise<DeliveryDetail | null>;
  /** order id -> rider, for the handful of board rows that can have one. */
  getDeliveriesFor(
    orderIds: readonly number[],
  ): Promise<ReadonlyMap<number, DeliveryDetail>>;
}

/* ------------------------------------------------------------- deliveries */

/**
 * A delivery beside the order it belongs to.
 *
 * Not a schema type: `GET /orders/{id}/delivery` answers one ride at a time and
 * the deliveries board needs a hundred, each with the order's promise and total
 * next to it. Composing the join here is what keeps the page from firing one
 * request per row — which is exactly the shape a real list endpoint would take.
 */
export interface DeliveryBoardRow {
  readonly delivery: DeliveryDetail;
  readonly order: OrderRead;
}

export interface DeliveryQuery extends PageQuery {
  /** Order id, rider name or phone. */
  readonly q: string;
  readonly status: DeliveryFilter;
}

/** "active" is assigned or picked up — a ride still on the road. */
export type DeliveryFilter = "active" | "assigned" | "picked_up" | "delivered" | "failed" | "any";

export interface DeliveriesService {
  listDeliveries(query: DeliveryQuery): Promise<Page<DeliveryBoardRow>>;
  /**
   * How many rides sit in each status, in one call.
   *
   * A board needs every count to draw its stage cards, and reading them as five
   * one-row pages would be five round trips for numbers one GROUP BY answers.
   */
  countByStatus(): Promise<Readonly<Record<DeliveryStatus, number>>>;
  listPartners(): Promise<readonly DeliveryPartnerRead[]>;
  /** Hand a stalled or failed ride to somebody else. */
  reassign(deliveryId: number, partnerId: number): Promise<DeliveryBoardRow>;
  /** Give up on a ride, with the reason recorded on the order's trail. */
  markFailed(deliveryId: number, reason: string): Promise<DeliveryBoardRow>;
}

/* ----------------------------------------------------------------- offers */

/** What creating a coupon needs. Mirrors the generated `CouponCreate`. */
export interface CouponInput {
  readonly code: string;
  readonly description: string;
  readonly discount_type: DiscountType;
  readonly discount_value: string;
  readonly max_discount_amount: string | null;
  readonly min_order_value: string;
  readonly scope: CouponScope;
  readonly restaurant_id: number | null;
  readonly cuisine_id: number | null;
  readonly valid_from: string;
  readonly valid_until: string;
  readonly usage_limit_total: number | null;
  readonly usage_limit_per_user: number;
}

/** Everything on `CouponInput` is editable, plus the switch. */
export type CouponPatch = Partial<CouponInput> & { readonly is_active?: boolean };

export interface OffersService {
  listCoupons(): Promise<Page<CouponRead>>;
  createCoupon(input: CouponInput): Promise<CouponRead>;
  updateCoupon(couponId: number, patch: CouponPatch): Promise<CouponRead>;
  setCouponActive(couponId: number, isActive: boolean): Promise<CouponRead>;
}

/* ---------------------------------------------------------------- finance */

export interface TransactionQuery extends PageQuery {
  /** Order id or the provider's own reference. */
  readonly q: string;
  /**
   * The statuses to include, or null for every status.
   *
   * A LIST, not one value, because the "Sent back" stage card deliberately folds
   * `refunded` and `partially_refunded` into a single count — and then filtered
   * on `refunded` alone, so the card read "Sent back 12" and the table beneath
   * it reported 8 of 8. Two money figures inches apart, disagreeing, with
   * nothing on screen to explain why.
   */
  readonly statuses: readonly PaymentStatus[] | null;
  /** Empty means every method. */
  readonly method: string | null;
}

export interface RefundQuery extends PageQuery {
  readonly q: string;
  readonly status: RefundStatus | null;
  /** Only refunds past the time the customer was promised their money. */
  readonly breachedOnly: boolean;
}

/**
 * What one kitchen owes and is owed over a window.
 *
 * There is no commission endpoint — `MetricsSummary.commission_revenue` is one
 * platform-wide figure — so the split per kitchen is computed from delivered
 * orders and the rate that applies to each. Money stays a decimal string all
 * the way through; the percent is a number because that is how it is
 * configured.
 */
// ALIASED to the generated schema, not re-declared.
//
// These were hand-written interfaces shadowing generated schemas of the SAME
// NAME, so the two declarations never met and nothing compared them. Three had
// already drifted from the contract:
//
//   isNegotiated        -> the API sends `is_negotiated`
//   commission_percent  -> typed `number`, the API sends a Decimal as `string`
//   default_percent     -> same
//
// Every one of those is read by live UI code, every one resolves to `undefined`
// or a string where a number was expected rather than throwing, and none is
// visible to `tsc`. `packages/api-client/src/fetcher.ts` ends with
// `return payload as TResponse` and there is no runtime validation at the
// boundary, so the first sign would have been a commission ledger quietly
// showing every kitchen on the default rate.
//
// Aliasing turns each drift into a compile error in the fixture builders, which
// is where it belongs.
export type CommissionRow = Schemas["CommissionRow"];
export type CommissionLedger = Schemas["CommissionLedger"];

/** The shape of a refund queue, before any of it is listed. */
export interface RefundTally {
  readonly byStatus: Readonly<Record<RefundStatus, number>>;
  /** Past the promise and not completed. A failed refund counts. */
  readonly breached: number;
  /** What those breached refunds are worth. */
  readonly owed: string;
}

export interface FinanceService {
  /** How many payment attempts sit in each status. One call, same reasoning. */
  countPaymentsByStatus(): Promise<Readonly<Record<PaymentStatus, number>>>;
  /** The refund queue's shape: per status, plus what is breached and owed. */
  countRefunds(): Promise<RefundTally>;
  listTransactions(query: TransactionQuery): Promise<Page<PaymentRead>>;
  listPaymentsForOrder(orderId: number): Promise<Page<PaymentRead>>;
  /** Refunds carry the platform's own `sla_breached` verdict. */
  listRefunds(query: RefundQuery): Promise<Page<RefundDetail>>;
  listRefundsForOrder(orderId: number): Promise<Page<RefundRead>>;
  /** Send a failed refund back to the provider. */
  retryRefund(refundId: number): Promise<RefundDetail>;
  /** Settle it by hand, when the money has been moved another way. */
  completeRefund(refundId: number): Promise<RefundDetail>;
  getLedger(days: number): Promise<CommissionLedger>;
}

/* ---------------------------------------------------------------- reports */

/** Every report is asked for over a window of whole days. */
export interface ReportRange {
  readonly days: number;
}

// ALIASED. The hand-written SalesDayRow called the date field `date`; the API
// calls it `day`. Four call sites in components/reports/sales-report.tsx read
// `row.date`, including `key={row.date}` — so against the real endpoint every
// row got `undefined` for its date AND `key={undefined}`, breaking React
// reconciliation on the table. The generated schema also carries `window_days`,
// which the hand-written pair omitted entirely.
export type SalesDayRow = Schemas["app__schemas__admin_reports__SalesDay"];
export type SalesReport = Schemas["SalesReport"];

export interface RestaurantReportRow extends CommissionRow {
  readonly cancelled_orders: number;
  readonly cancellation_rate: number;
  readonly avg_prep_minutes: number;
  /** End to end, from placed to handed over. Null with no deliveries. */
  readonly avg_delivery_minutes: number | null;
  readonly is_active: boolean;
}

export interface RestaurantReport {
  readonly rows: readonly RestaurantReportRow[];
  readonly gross: string;
  readonly commission: string;
  readonly days: number;
}

export interface OrderStatusRow {
  readonly status: OrderStatus;
  readonly orders: number;
  readonly share: number;
  readonly gross: string;
}

export interface OrderHourRow {
  /** 0–23, in the reader's own timezone. */
  readonly hour: number;
  readonly orders: number;
}

export interface OrderReport {
  readonly statuses: readonly OrderStatusRow[];
  readonly hours: readonly OrderHourRow[];
  readonly orders: number;
  readonly cancelled_inside_window: number;
  readonly cancelled_outside_window: number;
  /** Delivered orders handed over after the promised time. */
  readonly delivered_late: number;
  readonly avg_minutes_to_deliver: number | null;
  readonly days: number;
}

export interface CustomerReportRow {
  readonly user_id: number;
  readonly name: string;
  readonly email: string;
  readonly city: string;
  readonly avatar_url: string | null;
  readonly is_active: boolean;
  readonly orders: number;
  readonly delivered: number;
  readonly cancelled: number;
  readonly spend: string;
  readonly avg_order_value: string;
  readonly last_ordered_at: string | null;
}

export interface CustomerReport {
  /** Biggest spenders first. */
  readonly rows: readonly CustomerReportRow[];
  readonly customers: number;
  /** Placed a first order inside the window. */
  readonly new_customers: number;
  /** Ordered inside the window having ordered before it. */
  readonly returning_customers: number;
  /** Registered but has never ordered at all. */
  readonly never_ordered: number;
  readonly spend: string;
  readonly days: number;
}

export interface CommissionCityRow {
  readonly city: string;
  readonly restaurants: number;
  readonly delivered_orders: number;
  readonly gross: string;
  readonly commission: string;
}

export interface CommissionReport {
  readonly ledger: CommissionLedger;
  readonly cities: readonly CommissionCityRow[];
}

export interface ReportsService {
  sales(range: ReportRange): Promise<SalesReport>;
  restaurants(range: ReportRange): Promise<RestaurantReport>;
  orders(range: ReportRange): Promise<OrderReport>;
  customers(range: ReportRange): Promise<CustomerReport>;
  commission(range: ReportRange): Promise<CommissionReport>;
}

/* --------------------------------------------------------------- settings */

/**
 * What the platform charges, keeps and refuses.
 *
 * Operator-only: none of this is on the API schema yet, because today these
 * numbers live in the restaurant policy rows and in the pricing service's own
 * constants. Stating them as one settings object is what makes them editable in
 * one place, and is the shape a real settings endpoint would take.
 *
 * Money is a decimal string, exactly as the API sends money everywhere else.
 * Rates are percents rather than fractions, because that is how they are
 * written on a contract and typed into a form.
 */
export interface DeliverySettings {
  readonly base_fee: string;
  readonly per_km_fee: string;
  /** Order value above which delivery is free. */
  readonly free_delivery_above: string;
  /** Applied when the platform is running behind. */
  readonly surge_multiplier: string;
  readonly surge_after_minutes_late: number;
  readonly max_distance_km: string;
  readonly packaging_fee: string;
}

export interface CommissionOverride {
  readonly restaurant_id: number;
  readonly percent: number;
  /** Why this kitchen is off the standard rate. Shown beside it. */
  readonly note: string;
}

export interface CommissionSettings {
  readonly default_percent: number;
  /** How long after delivery a kitchen is paid. */
  readonly settlement_days: number;
  readonly overrides: readonly CommissionOverride[];
}

export interface TaxSettings {
  readonly gst_percent: number;
  readonly is_packaging_taxable: boolean;
  readonly is_delivery_taxable: boolean;
  readonly gstin: string;
}

export interface OrderRuleSettings {
  readonly min_order_value: string;
  readonly max_items_per_order: number;
  /** Cancel inside this and the customer pays nothing. */
  readonly free_cancellation_minutes: number;
  readonly late_cancellation_fee_percent: number;
  /** How long the customer is promised their money back within. */
  readonly refund_sla_hours: number;
  /** An order a kitchen has not confirmed by then is cancelled for them. */
  readonly auto_cancel_unconfirmed_minutes: number;
  /** Added to every promise, so a kitchen on time is not late by a minute. */
  readonly prep_buffer_minutes: number;
}

export interface PlatformSettings {
  readonly delivery: DeliverySettings;
  readonly commission: CommissionSettings;
  readonly tax: TaxSettings;
  readonly order_rules: OrderRuleSettings;
}

export interface SettingsService {
  get(): Promise<PlatformSettings>;
  /** Saves the whole object; the form owns validation before it gets here. */
  save(next: PlatformSettings): Promise<PlatformSettings>;
  /** Throws away local edits and returns the shipped defaults. */
  reset(): Promise<PlatformSettings>;
}

/* ---------------------------------------------------------------- session */

/**
 * Who is at the keyboard.
 *
 * Shaped like the API's `MeProfile` so a real session drops in unchanged, minus
 * the fields a fixture cannot honestly supply. NOT AUTHENTICATION — see
 * fixtures/session.ts, which says so at length.
 */
export interface OperatorAccount {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly city: string;
  readonly platform_role: "admin";
  readonly avatar_url: string | null;
  readonly created_at: string;
}

export interface SessionService {
  /** The signed-in operator, or null. Resolves immediately when signed out. */
  current(): Promise<OperatorAccount | null>;
  signIn(email: string, passphrase: string): Promise<OperatorAccount>;
  signOut(): Promise<void>;
  /** The seeded accounts, for the sign-in screen's development hint. */
  listAccounts(): Promise<readonly OperatorAccount[]>;
}

/* ------------------------------------------------------------------ bundle */

/* --------------------------------------- restaurants asking to join */

export interface ApplicationQuery extends PageQuery {
  /** null means every state — including the ones already answered. */
  readonly status: ApplicationStatus | null;
}

export interface ApplicationsService {
  /**
   * The queue, oldest first.
   *
   * Oldest and not newest, because this is a worklist rather than a feed:
   * sorting the newest to the top buries the application that has been waiting
   * longest, which is the one failure mode a queue must not have. The server
   * orders it; this passes the page through.
   */
  listApplications(query: ApplicationQuery): Promise<Page<RestaurantApplicationRow>>;
  /**
   * Say yes. Creates the restaurant CLOSED and makes the applicant its admin —
   * two rows, one act, and neither is this console's to assemble.
   *
   * Approving is not publishing. The kitchen stays invisible to customers until
   * its own owner opens it, by which time they have had the chance to write a
   * menu and a policy. Answers the application as it now stands, carrying the
   * `restaurant_id` that was minted.
   */
  approveApplication(
    applicationId: number,
    note: string | null,
  ): Promise<RestaurantApplicationRow>;
  /**
   * Say no, with a reason the applicant reads verbatim.
   *
   * The reason is required by the server and required here: a refusal nobody can
   * act on produces an applicant who resends the same form, and an operator who
   * answers it twice.
   */
  rejectApplication(
    applicationId: number,
    reason: string,
  ): Promise<RestaurantApplicationRow>;
}

export interface OperatorServices {
  readonly metrics: MetricsService;
  readonly applications: ApplicationsService;
  readonly catalog: CatalogService;
  readonly people: PeopleService;
  readonly orders: OrdersService;
  readonly deliveries: DeliveriesService;
  readonly offers: OffersService;
  readonly finance: FinanceService;
  readonly reports: ReportsService;
  readonly settings: SettingsService;
  readonly session: SessionService;
  /** Named in the shell so nobody debugs the wrong source. */
  readonly sourceName: "fixtures" | "api";
}
