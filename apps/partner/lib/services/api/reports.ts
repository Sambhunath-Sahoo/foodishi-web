/**
 * Reports and money, against the live API.
 *
 * These were `notImplemented` refusals until the routes shipped. They are the
 * one group where the interface was designed first and the endpoints built to
 * match it, so the mapping below is close to nothing — which is what the seam
 * was for.
 *
 * Two things the wire does that the interface does not, and both are deliberate
 * on the server's side rather than an oversight here:
 *
 *  - `/reports/*` is `require_staff` (a shift worker may read the day's trade),
 *    while `/earnings`, `/settlements` and `/ledger` are `admin_of_restaurant`.
 *    So a staff member calling the payments screens gets a real 403, and this
 *    app's own `payments.view` gate is exactly aligned with it rather than
 *    merely decorative.
 *  - The window is `date_from` / `date_to` as local calendar days, inclusive at
 *    both ends, capped at 366 days. `ReportWindow` is already that shape.
 */
import { api } from "@repo/api-client";
import type { components } from "@repo/api-client";
import type {
  EarningsSummary,
  LedgerEntry,
  Page,
  PerformanceReport,
  PopularItem,
  ReportWindow,
  SalesDay,
  Settlement,
} from "../../types";
import type { PaymentsService, ReportsService } from "../types";

/**
 * Namespaced on the wire because the operator console has its own `SalesDay`
 * with a different shape. Aliased here so the drift shows up as a build error
 * if either one moves.
 */
type WireSalesDay = components["schemas"]["app__schemas__reports__SalesDay"];

/** The query both report groups take. Written once so the two cannot drift. */
function windowQuery(window: ReportWindow): Record<string, string> {
  return { date_from: window.from, date_to: window.to };
}

export const apiReports: ReportsService = {
  sales(restaurantId, window, signal) {
    return api.get<readonly WireSalesDay[]>(
      `/restaurants/${restaurantId}/reports`,
      { signal, query: windowQuery(window) },
    ) as Promise<readonly SalesDay[]>;
  },

  popularItems(restaurantId, window, signal) {
    return api.get<readonly PopularItem[]>(
      `/restaurants/${restaurantId}/reports/items`,
      { signal, query: windowQuery(window) },
    );
  },

  performance(restaurantId, window, signal) {
    return api.get<PerformanceReport>(
      `/restaurants/${restaurantId}/reports/performance`,
      { signal, query: windowQuery(window) },
    );
  },
};

export const apiPayments: PaymentsService = {
  earnings(restaurantId, window, signal) {
    // The response also carries date_from/date_to — the window it was actually
    // cut on, echoed back. Not in EarningsSummary because no screen reads it
    // there: the screen already knows which window it asked for, and a second
    // copy is a second thing that can disagree.
    return api.get<EarningsSummary>(`/restaurants/${restaurantId}/earnings`, {
      signal,
      query: windowQuery(window),
    });
  },

  async settlements(restaurantId, signal) {
    // Paged on the wire, unpaged in the interface: a restaurant has one
    // statement a week, so a year is 52 rows and a screen that paged them would
    // be answering a question nobody asked. The limit is the API's own maximum.
    const page = await api.get<Page<Settlement>>(
      `/restaurants/${restaurantId}/settlements`,
      { signal, query: { limit: 100, offset: 0 } },
    );
    return page.items;
  },

  ledger(restaurantId, limit, offset, signal) {
    // The ledger route takes a window as well as paging. Sending none lets the
    // server apply its own default (the last 30 days), which is what the screen
    // wants — it is the transaction trail behind "this month", not all history.
    return api.get<Page<LedgerEntry>>(`/restaurants/${restaurantId}/ledger`, {
      signal,
      query: { limit, offset },
    });
  },
};
