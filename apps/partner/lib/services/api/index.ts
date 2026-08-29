/**
 * The API implementation of `PartnerServices`.
 *
 * All eight services now talk to real routes. When this file was written six of
 * them refused, and the diff between then and now is the point of the seam: the
 * endpoints were built to match `services/types.ts`, and nothing above this
 * directory changed when they landed.
 *
 * Two gaps remain, and both are deliberate rather than unbuilt:
 *
 *  - **Offers.** There is no `/offers` route and there should not be. A
 *    self-applying offer is a coupon scoped to the restaurant, which the
 *    platform already models — see ./offers.ts. The console's `Offer` entity is
 *    fixture-only and wants folding into coupons.
 *  - **Changing your own password.** Supabase can do it, but not while checking
 *    the current password first, and this console's contract says it must. See
 *    ./identity.ts.
 */
import type { PartnerServices } from "../types";
import { apiApplications } from "./applications";
import { apiIdentity } from "./identity";
import { apiMenu } from "./menu";
import { apiOffers } from "./offers";
import { apiOrders } from "./orders";
import { apiPayments, apiReports } from "./reports";
import { apiRestaurant } from "./restaurant";
import { apiStaff } from "./staff";

export const apiServices: PartnerServices = {
  identity: apiIdentity,
  applications: apiApplications,
  orders: apiOrders,
  menu: apiMenu,
  restaurant: apiRestaurant,
  staff: apiStaff,
  offers: apiOffers,
  reports: apiReports,
  payments: apiPayments,
  sourceName: "api",
};
