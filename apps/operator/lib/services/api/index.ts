/**
 * The API implementation of `OperatorServices`.
 *
 * All ten services talk to real routes. Fifty-three methods, and — with one
 * exception noted below — every one of them is a call to the FastAPI backend
 * rather than a computation over bundled JSON.
 *
 * When `../index.ts` was written it said there was "deliberately no api/
 * implementation" because half the calls in `../types` had no endpoint:
 * "platform settings, the commission ledger and the five reports are computed
 * here because no server computes them anywhere". Every one of those eight
 * routes exists now, and the only method that genuinely had nothing behind it —
 * `finance.countRefunds` — got `GET /admin/refunds/count` added for it, shaped
 * to match the `/admin/payments/count` and `/admin/deliveries/count` that were
 * already there.
 *
 * TWO THINGS A READER SHOULD KNOW.
 *
 * 1. `session` is not just HTTP. Sign-in is Supabase plus `GET /me`, and it
 *    refuses an account with no `platform_role`. See ./session.ts.
 *
 * 2. `session.listAccounts()` returns an empty array on purpose. It exists for
 *    the sign-in screen's development hint, there is no route that lists
 *    platform staff, and there should not be — "which addresses administer this
 *    platform" is not a question an endpoint should answer. The hint hides
 *    itself when the list is empty.
 *
 * Everything else is a plain mapping: camelCase in `../types`, snake_case on the
 * wire, `Page<T>` envelopes passed through untouched.
 */
import type { OperatorServices } from "../types";
import { apiApplications } from "./applications";
import { apiCatalog } from "./catalog";
import { apiDeliveries } from "./deliveries";
import { apiFinance } from "./finance";
import { apiMetrics } from "./metrics";
import { apiOffers } from "./offers";
import { apiOrders } from "./orders";
import { apiPeople } from "./people";
import { apiReports } from "./reports";
import { apiSession } from "./session";
import { apiSettings } from "./settings";

export const apiServices: OperatorServices = {
  metrics: apiMetrics,
  applications: apiApplications,
  catalog: apiCatalog,
  people: apiPeople,
  orders: apiOrders,
  deliveries: apiDeliveries,
  offers: apiOffers,
  finance: apiFinance,
  reports: apiReports,
  settings: apiSettings,
  session: apiSession,
  sourceName: "api",
};
