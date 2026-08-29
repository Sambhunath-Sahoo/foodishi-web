import type { PartnerServices } from "./types";
import { apiServices } from "./api";
import { fixtureServices } from "./fixtures";

/**
 * Where the partner console's data comes from.
 *
 * **This is the swap.** Both implementations satisfy the same interface, so
 * moving the whole console onto the real backend is
 * `NEXT_PUBLIC_DATA_SOURCE=api` in `apps/partner/.env.local` — no component,
 * hook or query key changes.
 *
 * The default is `fixtures` so every screen runs, and can be reviewed, without
 * the FastAPI service or Supabase up — and so the Manager and Staff versions of
 * this console, which are genuinely different products, can be compared by
 * signing in as one and then the other.
 *
 * What still needs the real thing when you flip it:
 *  - `offers`, `reports` and `payments` have no routes at all. Every method
 *    refuses with the endpoint it wanted; see `api/unsupported.ts`.
 *  - Add-on and variant groups are fixture-only for the same reason.
 *  - Per-person permissions are fixture-only: the API's membership row carries
 *    a role and nothing else, so a staff member there is exactly as capable as
 *    their role.
 *  - Editing your own profile and changing your own password have no routes.
 */
export type DataSource = "fixtures" | "api";

function resolveSource(): DataSource {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? "api" : "fixtures";
}

export const DATA_SOURCE: DataSource = resolveSource();

export const services: PartnerServices =
  DATA_SOURCE === "api" ? apiServices : fixtureServices;

export const isFixtureSource = DATA_SOURCE === "fixtures";

export type {
  AuthState,
  IdentityService,
  MenuService,
  OffersService,
  OrderQuery,
  OrdersService,
  PartnerServices,
  PasswordChange,
  PaymentsService,
  ProfilePatch,
  ReportsService,
  RestaurantService,
  StaffService,
} from "./types";
