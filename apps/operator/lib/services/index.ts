import { apiServices } from "./api";
import { fixtureServices } from "./fixtures";
import type { OperatorServices } from "./types";

/**
 * Where the console's data comes from. One line, on purpose.
 *
 * It used to be `= fixtureServices`, unconditionally, and the comment here
 * explained that there was "deliberately no api/ implementation yet" because
 * "platform settings, the commission ledger and the five reports are computed
 * here because no server computes them anywhere".
 *
 * That stopped being true. Every one of those eight routes exists —
 * `GET`/`PUT /admin/settings`, `GET /admin/commission`, and
 * `GET /admin/reports/{sales,restaurants,orders,customers,commission}` — and
 * `api/` now implements all fifty-three methods in `./types` against them.
 * `GET /admin/refunds/count` was added for `finance.countRefunds`, which was the
 * only method with no route behind it.
 *
 * Nothing above this file changed when that landed, which was the point of the
 * seam: `lib/queries.ts` imports `services` and calls methods on it, and no
 * page, hook or query key mentions either implementation.
 *
 * WHY THE FLAG STILL EXISTS. Fixtures are not dead weight — they are how this
 * console runs with no backend at all: a design review on a plane, a screenshot
 * for a deck, a component built before its endpoint. `NEXT_PUBLIC_DATA_SOURCE`
 * chooses, and `sourceName` on each bundle is what the shell prints so nobody
 * has to guess which one they are looking at.
 *
 * The DEFAULT IS THE API. It defaults the other way in apps/customer and
 * apps/partner, and that difference is deliberate: this console has no consumer
 * story and no offline mode, so a fixture-backed operations screen is only ever
 * a development convenience. Reading real numbers by default is the safer
 * accident — the opposite default let a reader mistake bundled JSON for the
 * platform's actual revenue.
 */
const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "api";

export const services: OperatorServices =
  source === "fixtures" ? fixtureServices : apiServices;

export type { OperatorServices } from "./types";
