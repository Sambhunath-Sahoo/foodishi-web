/**
 * The five operator reports, against the live API.
 *
 * `../index.ts` used to say "the five reports are computed here because no
 * server computes them anywhere". All five routes exist —
 * `GET /admin/reports/{sales,restaurants,orders,customers,commission}` — and each
 * takes a single `days` window, which is exactly what `ReportRange` carries. So
 * these are the thinnest files in `api/`: one call each, no mapping.
 *
 * NO REMAPPING, on purpose. Four of these response types were switched from
 * hand-written interfaces to aliases of the generated OpenAPI schemas, because
 * the hand-written copies had drifted: `isNegotiated` against the wire's
 * `is_negotiated`, `SalesDayRow.date` against the wire's `day`, and
 * `commission_percent`/`default_percent` typed `number` against decimal STRINGS.
 * Every one of those was read by live UI code and none was visible to `tsc`,
 * because the two declarations never met.
 *
 * They meet now, which means the shapes below ARE the wire shapes and returning
 * the response untouched is correct. Anything that looks like it wants renaming
 * here is the drift trying to come back.
 */
import { api } from "@repo/api-client";

import type {
  CommissionReport,
  CustomerReport,
  OrderReport,
  ReportRange,
  ReportsService,
  RestaurantReport,
  SalesReport,
} from "../types";

/**
 * `ReportRange` is `{ days }` and every route takes `days`, so the mapping is
 * the identity. Kept as a named helper rather than inlined five times so that
 * the day a report grows a second dimension there is one place to widen.
 */
function windowOf(range: ReportRange): { readonly days: number } {
  return { days: range.days };
}

export const apiReports: ReportsService = {
  sales(range) {
    return api.get<SalesReport>("/admin/reports/sales", { query: windowOf(range) });
  },

  restaurants(range) {
    return api.get<RestaurantReport>("/admin/reports/restaurants", {
      query: windowOf(range),
    });
  },

  orders(range) {
    return api.get<OrderReport>("/admin/reports/orders", {
      query: windowOf(range),
    });
  },

  customers(range) {
    // Note for whoever reads the screen: this response caps its `rows` at the
    // top 25 while `customers` counts every ordering customer, so the two
    // deliberately disagree. That is the API's shape, not a truncation added
    // here, and the table's footer is where it has to be explained.
    return api.get<CustomerReport>("/admin/reports/customers", {
      query: windowOf(range),
    });
  },

  commission(range) {
    return api.get<CommissionReport>("/admin/reports/commission", {
      query: windowOf(range),
    });
  },
};
