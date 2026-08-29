/**
 * The platform's own figures, against the live API.
 *
 * Five reads and no writes. Every number here spans the whole platform, which
 * is why all five sit behind `require_platform_role` on the server — the guard
 * hangs off the routers rather than the routes, so a customer or a partner with
 * a perfectly valid token gets a 403 from the API itself and not merely a
 * console that declines to draw the page.
 *
 * `getWorkload` is the odd one out by prefix: `/admin/workload` rather than
 * `/admin/metrics/workload`, because on the server it belongs to the console's
 * chrome — the navigation reads it on every page — and lives in
 * routers/admin_platform.py beside the settings. It is grouped with the metrics
 * here because that is what it is to the reader, not because the two share a
 * prefix.
 *
 * Nothing on this service takes an AbortSignal. `MetricsService` declares none,
 * and lib/queries/metrics.ts forwards none, so adding one would be a parameter
 * no caller can reach.
 */
import { api } from "@repo/api-client";
import type {
  OrderFunnel,
  OrdersOverTimePoint,
  Page,
  PlatformSummary,
  RestaurantMetrics,
} from "../../api-types";
import type { MetricsService, Workload } from "../types";

/**
 * The API's own ceiling on any page (`app/core/pagination.MAX_LIMIT`). Asking
 * for more is a 422, not a longer page.
 */
const MAX_PAGE_LIMIT = 100;

export const apiMetrics: MetricsService = {
  getSummary() {
    // One request for the whole rail, because that is how the endpoint is
    // built: thirteen figures out of a single aggregate pass, so a tile-per-call
    // client would be paying for eight sequential round trips to draw one row.
    return api.get<PlatformSummary>("/admin/metrics/summary");
  },

  getWorkload() {
    // Typed against the interface's own `Workload`, NOT the generated schema
    // alias, and that is load-bearing rather than a shortcut. The checked-in
    // `components["schemas"]["Workload"]` is missing `orders_late` — the API
    // sends it (app/schemas/admin.py declares it, and the route populates it),
    // the generated types were cut before it landed. Aliasing the stale schema
    // would type the field away on the one call the navigation makes on every
    // page. Regenerating the client is the real fix; until then the interface is
    // the more accurate description of the wire.
    return api.get<Workload>("/admin/workload");
  },

  listOrdersOverTime(days) {
    // A bare list, not a Page — the only list endpoint in this console that is
    // not paged, because a bounded window is its own limit.
    //
    // The server takes 1..365 and answers 422 outside that, so `days` is passed
    // through rather than clamped here: a chart asking for two years is a bug in
    // the chart, and silently serving it one year would hide it.
    //
    // Days with no orders are ABSENT rather than zero-filled. The endpoint says
    // so deliberately — the caller knows the window it asked for — so whatever
    // pads the series belongs above this seam, not here.
    return api.get<readonly OrdersOverTimePoint[]>(
      "/admin/metrics/orders-over-time",
      { query: { days } },
    );
  },

  getFunnel() {
    return api.get<OrderFunnel>("/admin/metrics/funnel");
  },

  listRestaurantMetrics() {
    // Paged on the wire, unpaged in the interface — so this asks for the widest
    // page the server will cut and hands the envelope straight back.
    //
    // Truncation is visible rather than silent if the platform ever outgrows it:
    // the server computes the full per-kitchen roll-up and windows it in Python,
    // so `total` is the real number of kitchens even when `items` stops at 100.
    // A table showing 100 of 140 is the signal that this call needs an offset;
    // a table showing 100 of 100 would not have been.
    return api.get<Page<RestaurantMetrics>>("/admin/metrics/restaurants", {
      query: { limit: MAX_PAGE_LIMIT, offset: 0 },
    });
  },
};
