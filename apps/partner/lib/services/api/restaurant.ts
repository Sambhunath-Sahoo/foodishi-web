/**
 * The restaurant against the live API.
 *
 * GET /restaurants/{id} is unauthenticated and is NOT filtered on `is_active`,
 * which is the whole reason a closed kitchen can still open its settings screen
 * and reopen itself.
 *
 * The two writes are separate routes on the server, and this interface keeps
 * them separate for the same reason: PATCH is the profile and the hours, PUT
 * /availability is the switch a customer feels immediately.
 */
import { api } from "@repo/api-client";
import type { RestaurantDetail, RestaurantPatch, RestaurantPolicy } from "../../types";
import type { RestaurantService } from "../types";

export const apiRestaurant: RestaurantService = {
  get(restaurantId, signal) {
    return api.get<RestaurantDetail>(`/restaurants/${restaurantId}`, { signal });
  },

  getPolicy(restaurantId, signal) {
    return api.get<RestaurantPolicy>(`/restaurants/${restaurantId}/policy`, { signal });
  },

  async update(restaurantId, patch: RestaurantPatch) {
    // PATCH answers the columns without the cuisines or the policy, and this
    // interface promises the whole profile — so the write is followed by the
    // read. One extra round trip, and the caller cannot end up holding a
    // half-populated restaurant it then renders.
    await api.patch<unknown>(`/restaurants/${restaurantId}`, patch);
    return api.get<RestaurantDetail>(`/restaurants/${restaurantId}`);
  },

  async setAcceptingOrders(restaurantId, isActive) {
    // A PUT with the boolean stated out loud rather than a PATCH: there is one
    // field, so "closed" cannot be an omission.
    await api.put<unknown>(`/restaurants/${restaurantId}/availability`, {
      is_active: isActive,
    });
    return api.get<RestaurantDetail>(`/restaurants/${restaurantId}`);
  },
};
