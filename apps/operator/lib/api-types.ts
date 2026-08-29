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
