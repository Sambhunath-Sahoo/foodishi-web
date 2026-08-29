/**
 * Names for the generated schema types, so pages read as domain code rather
 * than as index expressions. Nothing is hand-written: every shape below comes
 * from the live FastAPI schema via `pnpm --filter @repo/api-client gen`.
 */
import type { components } from "@repo/api-client";

type Schemas = components["schemas"];

export type MetricsSummary = Schemas["MetricsSummary"];
export type OrdersOverTimePoint = Schemas["OrdersOverTimePoint"];
export type OrderFunnel = Schemas["OrderFunnel"];
export type StatusCount = Schemas["StatusCount"];
export type RestaurantMetrics = Schemas["RestaurantMetrics"];
export type RestaurantSummary = Schemas["RestaurantSummary"];
export type MyRestaurantRead = Schemas["MyRestaurantRead"];
/** The whole restaurant, cuisines and delivery policy included. */
export type RestaurantDetail = Schemas["RestaurantDetail"];
export type RestaurantPolicy = Schemas["app__schemas__catalog__RestaurantPolicyRead"];
export type Cuisine = Schemas["CuisineRead"];

/**
 * The summary as the console reads it.
 *
 * Every figure the operator checklist asks for is on the generated schema
 * already, so this is an alias rather than an intersection — the name is kept
 * because eleven call sites read it and because "platform summary" is what the
 * thing is, while `MetricsSummary` is what the endpoint calls its response.
 */
export type PlatformSummary = MetricsSummary;

export type OrderRead = Schemas["OrderRead"];
export type UserRead = Schemas["UserRead"];
export type AddressRead = Schemas["AddressRead"];
/** The order's delivery, with the rider embedded. */
export type DeliveryDetail = Schemas["DeliveryDetail"];
export type OrderDetail = Schemas["OrderDetail"];
export type OrderItemRead = Schemas["OrderItemRead"];
export type OrderEventRead = Schemas["OrderEventRead"];
export type OrderStatus = Schemas["OrderStatus"];
export type ActorType = Schemas["ActorType"];
export type DeliveryPartnerRead = Schemas["DeliveryPartnerRead"];
export type DeliveryStatus = Schemas["DeliveryStatus"];

export type PaymentRead = Schemas["PaymentRead"];
export type PaymentMethod = Schemas["PaymentMethod"];
export type PaymentStatus = Schemas["PaymentStatus"];
export type RefundRead = Schemas["RefundRead"];
/** The single-refund read. Unlike RefundRead it carries the server's own
 *  `sla_breached` verdict, so the SLA page never re-derives it. */
export type RefundDetail = Schemas["RefundDetail"];
export type RefundStatus = Schemas["RefundStatus"];
export type RefundReason = Schemas["RefundReason"];

export type CouponRead = Schemas["CouponRead"];
export type DiscountType = Schemas["DiscountType"];
export type CouponScope = Schemas["CouponScope"];

/** The API's pagination envelope, identical on every list endpoint. */
export interface Page<TItem> {
  readonly items: readonly TItem[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

/* ------------------------------------------- restaurants asking to join */

/**
 * The application queue's row.
 *
 * The one shape in this file that is NOT generated, and the header above says
 * nothing is — so here is why. The routes exist
 * (`GET /admin/restaurant-applications` and the two decisions under it), but
 * `packages/api-client/src/types/api.d.ts` is regenerated from a RUNNING API
 * with `pnpm --filter @repo/api-client gen`. Until that has been run against an
 * API carrying these routes, `Schemas["AdminApplicationRow"]` does not exist and
 * aliasing it would not compile.
 *
 * Replace both declarations below with aliases once it has been run. Nothing
 * else needs to change: the field names here are the wire's own.
 */
export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface RestaurantApplicationRow {
  readonly id: number;
  readonly status: ApplicationStatus;

  /** The restaurant as proposed. Every column `restaurants` requires. */
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly city: string;
  readonly area: string;
  readonly address_line: string;
  readonly latitude: string;
  readonly longitude: string;
  readonly phone: string;
  readonly price_for_two: string;
  readonly avg_prep_minutes: number;
  readonly opens_at: string;
  readonly closes_at: string;
  /** Whatever the applicant wanted an operator to know. Not shown to customers. */
  readonly note: string | null;

  /**
   * The applicant, read from their CURRENT users row rather than copied onto the
   * application when it was sent — so the address an operator writes to is the
   * one that works today.
   */
  readonly applicant_user_id: number;
  readonly applicant_name: string;
  readonly applicant_email: string;
  readonly applicant_phone: string;
  /**
   * Whether the applicant's own account is still usable. An approval on a
   * deactivated account is refused by the server, so the queue says so before
   * anybody clicks.
   */
  readonly is_applicant_active: boolean;

  readonly decision_note: string | null;
  readonly reviewed_at: string | null;
  /** The restaurant an approval created. Null until then, and after a refusal. */
  readonly restaurant_id: number | null;
  readonly created_at: string;
  readonly updated_at: string;
}
