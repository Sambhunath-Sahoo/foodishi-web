import meta from "../data/meta.json";

/**
 * Why every timestamp in the seed moves.
 *
 * The JSON in ../data is one coherent evening: 31 orders in flight, sixteen of
 * them past their promise, five refunds still owed a week later. Written down
 * as fixed instants, that evening is over the moment it is committed — open the
 * console a fortnight later and the live board is empty, every lateness figure
 * is a month, and the one screen the console exists for shows nothing.
 *
 * So the seed is anchored: `meta.anchor` is the instant it was written around,
 * and everything read out of ../data is slid forward by `now - anchor`. The
 * evening therefore always reads as tonight. Relative distances — an order
 * placed twelve minutes ago, a refund due eighteen hours after it was raised —
 * are preserved exactly, because every row moves by the same amount.
 *
 * The shift is fixed once, at module load, rather than recomputed per call: two
 * timestamps on one screen sliding by different amounts is how "promised at
 * 19:26" ends up 30 seconds later than "delivered at 19:26".
 *
 * Nothing outside this file knows about any of it. A real backend sends real
 * instants, and `shiftIso` disappears with the fixture source that needs it.
 */
const ANCHOR_MS = Date.parse(meta.anchor);

const SHIFT_MS = Date.now() - ANCHOR_MS;

/** One seeded instant, as it should read now. */
export function shiftIso(iso: string): string {
  return new Date(Date.parse(iso) + SHIFT_MS).toISOString();
}

/** The same, for a field that is legitimately absent. */
export function shiftOptionalIso(iso: string | null): string | null {
  return iso === null ? null : shiftIso(iso);
}

/**
 * Reading order: the seed as one instant, so a service that has to compare a
 * seeded row against "now" uses the same clock the rows were built on rather
 * than drifting a few milliseconds away from it mid-request.
 */
export function seedNow(): number {
  return ANCHOR_MS + SHIFT_MS;
}
