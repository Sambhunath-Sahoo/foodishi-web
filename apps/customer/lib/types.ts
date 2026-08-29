/**
 * Row shapes, named once, straight off the generated FastAPI schema.
 * Nothing here is hand-written: if the API changes, `pnpm gen` moves these.
 */
import type { components, paths } from "@repo/api-client";

type Schemas = components["schemas"];

export type RestaurantSummary = Schemas["RestaurantSummary"];
export type RestaurantDetail = Schemas["RestaurantDetail"];
export type RestaurantPolicy = Schemas["app__schemas__catalog__RestaurantPolicyRead"];
export type MenuCategory = Schemas["app__schemas__catalog__MenuCategoryRead"];
export type MenuItem = Schemas["app__schemas__catalog__MenuItemRead"];
export type Cuisine = Schemas["CuisineRead"];

/**
 * The sort keys `GET /restaurants` actually accepts, read off the generated
 * schema rather than retyped. Adding one server-side then makes it available
 * here, and removing one fails the build instead of 422-ing at runtime.
 */
export type RestaurantSort = NonNullable<
  NonNullable<paths["/restaurants"]["get"]["parameters"]["query"]>["sort"]
>;
export type SpiceLevel = Schemas["SpiceLevel"];

/**
 * A dish's gallery row. `MenuItemRead.image_url` is only the cover, so the
 * single-dish screen reads the rest from GET /menu-items/{id}/images.
 */
export type MenuItemImage = Schemas["ImageRead"];

export type Address = Schemas["AddressRead"];
export type AddressCreate = Schemas["AddressCreate"];

export type Quote = Schemas["QuoteRead"];
export type QuoteRequest = Schemas["QuoteRequest"];
export type OrderRead = Schemas["OrderRead"];
export type OrderDetail = Schemas["OrderDetail"];
export type OrderStatusRead = Schemas["OrderStatusRead"];
export type OrderEvent = Schemas["OrderEventRead"];
export type CancelResult = Schemas["CancelResult"];
export type OrderStatus = Schemas["OrderStatus"];

export type CouponValidation = Schemas["CouponValidation"];

/** Every list endpoint answers with the same envelope. */
export interface Page<TItem> {
  readonly items: readonly TItem[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export type Payment = Schemas["PaymentRead"];
export type OrderItem = Schemas["OrderItemRead"];
export type OrderItemIn = Schemas["OrderItemIn"];
export type ActorType = Schemas["ActorType"];

/**
 * The caller's own profile, as GET /me answers it and PATCH /me takes it.
 * Named `UserProfile*` rather than `User*` so neither collides with
 * @repo/api-client's `UserProfile` where a file imports from both.
 *
 * UserProfileUpdate is every-field-optional and rejects an explicit null, so a
 * caller sends only what changed — see lib/queries/profile.ts.
 */
export type UserProfileRead = Schemas["UserRead"];
export type UserProfileUpdate = Schemas["UserUpdate"];
