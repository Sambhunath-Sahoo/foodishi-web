/**
 * Orders against the live API.
 *
 * No identity argument anywhere: the server derives the caller, the restaurants
 * they may act for, and the actor written onto the audit trail from the bearer
 * token alone. `actor_type: "restaurant"` still travels in the body because the
 * body still carries the field and the server notes any body that disagrees
 * with its token — a kitchen quietly defaulting to "user" would fill that note
 * with one line per rejection. Saying what is true keeps the disagreements real.
 */
import { api } from "@repo/api-client";
import type {
  Address,
  CancelResult,
  Customer,
  Order,
  OrderClock,
  OrderDetail,
  OrderEvent,
  OrdersPage,
} from "../../types";
import type { OrderQuery, OrdersService, RefuseOrder, StatusChange } from "../types";

export const apiOrders: OrdersService = {
  list(query: OrderQuery, signal) {
    return api.get<OrdersPage>("/orders", {
      signal,
      query: {
        restaurant_id: query.restaurantId,
        live: query.live,
        status: query.status,
        placed_from: query.placedFrom,
        placed_to: query.placedTo,
        q: query.q,
        limit: query.limit,
        offset: query.offset,
      },
    });
  },

  get(orderId, signal) {
    return api.get<OrderDetail>(`/orders/${orderId}`, { signal });
  },

  getClock(orderId, signal) {
    return api.get<OrderClock>(`/orders/${orderId}/status`, { signal });
  },

  listEvents(orderId, signal) {
    return api.get<readonly OrderEvent[]>(`/orders/${orderId}/events`, { signal });
  },

  updateStatus({ orderId, status }: StatusChange) {
    return api.patch<Order>(`/orders/${orderId}/status`, {
      status,
      actor_type: "restaurant",
    });
  },

  reject({ orderId, reason }: RefuseOrder) {
    // Its own door on the server, not a cancellation wearing different words:
    // once a kitchen has said yes the customer has been promised dinner, and
    // the server answers 409 rather than quietly downgrading a reject.
    return api.post<CancelResult>(`/orders/${orderId}/reject`, {
      reason,
      actor_type: "restaurant",
    });
  },

  cancel({ orderId, reason }: RefuseOrder) {
    return api.post<CancelResult>(`/orders/${orderId}/cancel`, {
      reason,
      actor_type: "restaurant",
    });
  },

  getCustomer(userId, signal) {
    // A 403 here is the designed answer, not a fault: the customer's name and
    // phone are the customer's. The screens draw it quietly.
    return api.get<Customer>(`/users/${userId}`, { signal });
  },

  getAddress(addressId, signal) {
    return api.get<Address>(`/addresses/${addressId}`, { signal });
  },
};
