/**
 * Platform settings, against the live API.
 *
 * `../index.ts` used to say these were "computed here because no server computes
 * them anywhere". `GET`/`PUT /admin/settings` and `POST /admin/settings/reset`
 * all exist, and the API groups them exactly as this console does — delivery,
 * commission, tax, order_rules — so the four groups pass through untouched.
 *
 * TWO THINGS ARE NOT A PASS-THROUGH, and both are written out rather than
 * quietly papered over.
 *
 * 1. DECIMALS ARE STRINGS ON THE WIRE and numbers in `PlatformSettings`. Every
 *    money and percent field is parsed on the way in and stringified on the way
 *    out. That does mean a settings value round-trips through a float, which is
 *    exactly what this codebase refuses to do for an ORDER — but a settings form
 *    binds to number inputs, the values are two-decimal configuration rather
 *    than a charge, and the server re-validates precision on write. Order
 *    pricing never touches this path.
 *
 * 2. NEGOTIATED COMMISSION RATES ARE READ HERE AND WRITTEN ELSEWHERE.
 *    `GET /admin/settings` returns them as `commission.negotiated`
 *    (`{restaurant_id, name, percent}`), but `PUT /admin/settings` does not
 *    accept them: a per-restaurant rate lives on `restaurants.commission_percent`
 *    and is set one at a time through
 *    `PUT /admin/restaurants/{id}/commission`. So `save()` writes the four
 *    groups and then fans out one call per changed override. The alternative —
 *    dropping `overrides` on save — would be a screen that appears to store a
 *    rate it does not, which is the worst failure a settings form has.
 */
import { api } from "@repo/api-client";

import type {
  CommissionOverride,
  PlatformSettings,
  SettingsService,
} from "../types";

/** `GET /admin/settings`, with decimals as the strings they arrive as. */
interface WireSettings {
  readonly delivery: Record<string, string | number | null>;
  readonly commission: {
    readonly default_percent: string;
    readonly settlement_days: number;
    readonly negotiated: readonly {
      readonly restaurant_id: number;
      readonly name: string;
      readonly percent: string;
    }[];
  };
  readonly tax: Record<string, string | number | boolean | null>;
  readonly order_rules: Record<string, string | number | null>;
  readonly updated_at: string;
}

/** A decimal string to the number the form binds to. Null stays null. */
function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parse the decimal-string members of one group, leaving booleans and integers
 * alone.
 *
 * Driven by the VALUE's type rather than a per-field list: the wire sends a
 * decimal as a string and everything else as itself, so "is it a string that
 * parses as a number" is the whole rule. `gstin` is a string that does not parse
 * and therefore survives, which is what makes this safe.
 */
function parseGroup<T>(group: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(group)) {
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      out[key] = Number.isFinite(parsed) && value.trim() !== "" ? parsed : value;
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

/** Numbers back to the strings the wire's Decimal fields expect. */
function stringifyGroup(group: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(group)) {
    out[key] = typeof value === "number" ? String(value) : value;
  }
  return out;
}

function fromWire(wire: WireSettings): PlatformSettings {
  return {
    delivery: parseGroup(wire.delivery),
    commission: {
      default_percent: toNumber(wire.commission.default_percent) ?? 0,
      settlement_days: wire.commission.settlement_days,
      // `name` is the RESTAURANT's name; `note` is the console's annotation
      // field. They are not the same thing, and the API stores no note — so the
      // restaurant name is shown there rather than inventing an empty one, and a
      // note typed in this console does not persist. Said plainly because a
      // field that silently forgets is worse than a field that is read-only.
      overrides: wire.commission.negotiated.map(
        (row): CommissionOverride => ({
          restaurant_id: row.restaurant_id,
          percent: toNumber(row.percent) ?? 0,
          note: row.name,
        }),
      ),
    },
    tax: parseGroup(wire.tax),
    order_rules: parseGroup(wire.order_rules),
  } as PlatformSettings;
}

async function read(): Promise<PlatformSettings> {
  return fromWire(await api.get<WireSettings>("/admin/settings"));
}

export const apiSettings: SettingsService = {
  get: read,

  async save(next: PlatformSettings) {
    // A full REPLACE, not a patch: `PUT /admin/settings` is deliberately a PUT,
    // and the form owns validation before it gets here. Sending a partial body
    // would blank whatever it omitted.
    await api.put<WireSettings>("/admin/settings", {
      delivery: stringifyGroup(next.delivery as unknown as Record<string, unknown>),
      commission: {
        default_percent: String(next.commission.default_percent),
        settlement_days: next.commission.settlement_days,
      },
      tax: stringifyGroup(next.tax as unknown as Record<string, unknown>),
      order_rules: stringifyGroup(
        next.order_rules as unknown as Record<string, unknown>,
      ),
    });

    // Then the per-restaurant rates, one call each, because that is the only
    // route that writes them. Sequential rather than parallel: they are a
    // handful, they touch the same table, and a half-applied set of rates is
    // easier to reason about in order than interleaved.
    for (const override of next.commission.overrides) {
      await api.put(
        `/admin/restaurants/${String(override.restaurant_id)}/commission`,
        { percent: String(override.percent) },
      );
    }

    // Re-read rather than trusting the PUT's echo: the negotiated rates were
    // written by a different route, so only a fresh GET shows the whole truth.
    return read();
  },

  async reset() {
    await api.post<WireSettings>("/admin/settings/reset");
    // Same reasoning as save(): reset does not clear negotiated rates, since
    // those live on the restaurants table, so re-read to show what is actually
    // in force.
    return read();
  },
};
