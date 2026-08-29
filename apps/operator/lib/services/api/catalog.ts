/**
 * The catalogue against the live API: the kitchens, one kitchen, and the
 * cuisines.
 *
 * The three reads are the customer app's own public endpoints, not admin ones.
 * `GET /restaurants`, `GET /restaurants/{id}` and `GET /cuisines` are
 * unauthenticated by design — the customer app searches before anybody signs in
 * — so these are the only calls in this console that work without a token. That
 * is worth knowing when a screen renders while everything around it 401s: the
 * kitchen names are not evidence the session is good.
 *
 * The two writes are a different story, and the comments on them say so: the
 * routes exist, but their guard is scoped to the restaurant rather than to the
 * platform, and this console's caller is the platform.
 *
 * No AbortSignal anywhere: `CatalogService` declares none and
 * lib/queries/catalog.ts forwards none.
 */
import { api } from "@repo/api-client";
import type {
  Cuisine,
  Page,
  RestaurantDetail,
  RestaurantSummary,
} from "../../api-types";
import type { CatalogService, RestaurantPatch } from "../types";

/**
 * How many kitchens to ask for.
 *
 * `listRestaurants()` takes no arguments because the operator console lists
 * every kitchen there is — the sidebar's directory maps id -> kitchen for the
 * order boards, and a paged directory would mean a board row whose restaurant
 * fell off page two rendering as "#12". The platform is small enough for that
 * to be honest: 25 seeded kitchens against the server's own per-page ceiling of
 * 100 (`app/core/pagination.MAX_LIMIT`), above which the request is a 422
 * rather than a longer page.
 */
const CATALOGUE_LIMIT = 100;

export const apiCatalog: CatalogService = {
  listRestaurants() {
    // NOT the whole catalogue, and the interface says it should be: "active and
    // deactivated alike". `GET /restaurants` opens with
    // `where(Restaurant.is_active.is_(True))` unconditionally — it is the
    // customer's discovery listing, and there is no `include_inactive` flag to
    // pass and no platform-scoped equivalent under `/admin`. So against the real
    // API a deactivated kitchen disappears from this list, the "switched off"
    // tile reads zero, and an order placed before the switch shows "#12" in the
    // directory instead of a name.
    //
    // Left as the plain call rather than papered over: the alternative shapes
    // available today are all worse. `/admin/metrics/restaurants` does cover
    // every kitchen that exists, but it answers `RestaurantMetrics` — no slug,
    // no area, no rating, no cover — so composing this list out of it would
    // fabricate a `RestaurantSummary` from fields the platform never sent. The
    // real fix is a platform-scoped listing on the API.
    return api.get<Page<RestaurantSummary>>("/restaurants", {
      query: { limit: CATALOGUE_LIMIT, offset: 0 },
    });
  },

  getRestaurant(restaurantId) {
    // Unlike the listing, the single read is NOT filtered on `is_active`, which
    // is what lets an operator open a kitchen they have just switched off.
    return api.get<RestaurantDetail>(`/restaurants/${restaurantId}`);
  },

  async updateRestaurant(restaurantId, patch: RestaurantPatch) {
    // `RestaurantPatch` is already the wire's own field names — it was written
    // as a deliberate narrowing of the generated `RestaurantUpdate` (no slug, no
    // latitude/longitude, no is_active), so every key on it is a key the schema
    // accepts and there is nothing to map.
    //
    // PATCH answers `RestaurantRead`: the columns, without the cuisines or the
    // delivery policy. This interface promises the whole `RestaurantDetail`, so
    // the write is followed by the read — one extra round trip, and no caller
    // left holding a half-populated restaurant it then renders. Same shape as
    // apps/partner/lib/services/api/restaurant.ts.
    //
    // EXPECT A 403 UNTIL THE API GROWS A PLATFORM-SCOPED WRITE. The route is
    // `admin_of_restaurant` (routers/catalog_admin.py), which resolves through
    // `require_staff` and — per dependencies/scope.py's own docstring — does not
    // consult `platform_staff`. Foodishi's operators staff no restaurant, so
    // this console cannot pass it. The call is wired rather than refused
    // locally so the server's own `detail` reaches the screen verbatim, and so
    // that this file needs no edit on the day the guard admits platform admins.
    await api.patch<unknown>(`/restaurants/${restaurantId}`, patch);
    return api.get<RestaurantDetail>(`/restaurants/${restaurantId}`);
  },

  async setRestaurantActive(restaurantId, isActive) {
    // PATCH with the one field rather than PUT /availability, though both write
    // the same `restaurants.is_active` column. The availability route is the
    // kitchen's own "we are closed right now" switch — a restaurant admin
    // acting on their own trade — while this is the platform suspending a
    // kitchen, and the two are different acts that happen to share a column.
    // The API has no platform suspension switch of its own yet (its own comment
    // on that route notes that `is_active` "is not the platform's own
    // suspension switch"), so the generic column write is the closer fit: it
    // says what it changes and claims nothing about who is closing the kitchen.
    //
    // Sent as a body of exactly one field, so "off" can never be an omission.
    // Same 403 as `updateRestaurant` above, for the same reason — this route is
    // `admin_of_restaurant` too.
    await api.patch<unknown>(`/restaurants/${restaurantId}`, {
      is_active: isActive,
    });
    return api.get<RestaurantDetail>(`/restaurants/${restaurantId}`);
  },

  listCuisines() {
    // Unpaged on the wire as well as in the interface: the set is a fixed
    // handful (8 seeded) and every client needs all of it to draw a filter bar,
    // so there is no envelope to unwrap here.
    return api.get<readonly Cuisine[]>("/cuisines");
  },
};
