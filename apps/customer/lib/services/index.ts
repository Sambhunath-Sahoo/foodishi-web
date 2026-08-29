import type { FoodishiServices } from "./types";
import { apiServices } from "./api";
import { fixtureServices } from "./fixtures";

/**
 * Where the customer app's data comes from.
 *
 * **This is the swap.** Both implementations satisfy the same interface, so
 * moving the whole app onto the real backend is `NEXT_PUBLIC_DATA_SOURCE=api`
 * — no component, hook or query key changes. Set it per app in
 * `apps/customer/.env.local`.
 *
 * The default is `fixtures` so the UI runs, and can be reviewed, without the
 * FastAPI service up.
 *
 * What still needs the real thing when you flip it:
 *  - Sign-in is Supabase either way; fixtures do not fake a session.
 *  - `reviews`, `favorites`, `support` and delivery notes have no endpoints at
 *    all yet. They live in `lib/reviews.ts`, `lib/favorites.ts`,
 *    `lib/support.ts` and `lib/delivery-notes.ts`, one hook each, and are the
 *    next things to move behind this interface once routes exist.
 */
export type DataSource = "fixtures" | "api";

function resolveSource(): DataSource {
  const configured = process.env.NEXT_PUBLIC_DATA_SOURCE;
  return configured === "api" ? "api" : "fixtures";
}

export const DATA_SOURCE: DataSource = resolveSource();

export const services: FoodishiServices =
  DATA_SOURCE === "api" ? apiServices : fixtureServices;

export const isFixtureSource = DATA_SOURCE === "fixtures";

export type {
  CatalogService,
  OrdersService,
  RestaurantQuery,
  FoodishiServices,
} from "./types";
