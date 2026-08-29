import type { OperatorServices } from "../types";
import { fixtureCatalog } from "./catalog";
import { fixtureDeliveries } from "./deliveries";
import { fixtureFinance } from "./finance";
import { fixtureMetrics } from "./metrics";
import { fixtureOffers } from "./offers";
import { fixtureOrders } from "./orders";
import { fixturePeople } from "./people";
import { fixtureReports } from "./reports";
import { fixtureSession } from "./session";
import { fixtureSettings } from "./settings";

/**
 * The whole platform, out of bundled JSON.
 *
 * Assembled here and nowhere else, so ../index.ts has exactly one thing to
 * swap. Everything about how this source behaves — the anchor slide, the
 * settle delay, the localStorage overlay — is contained in this directory and
 * invisible to every caller.
 */
export const fixtureServices: OperatorServices = {
  metrics: fixtureMetrics,
  catalog: fixtureCatalog,
  people: fixturePeople,
  orders: fixtureOrders,
  deliveries: fixtureDeliveries,
  offers: fixtureOffers,
  finance: fixtureFinance,
  reports: fixtureReports,
  settings: fixtureSettings,
  session: fixtureSession,
  sourceName: "fixtures",
};
