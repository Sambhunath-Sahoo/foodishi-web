/**
 * Severity grading — "671 min late" must never render like "3 min late".
 *
 * DENSITY.md §3 grades lateness in three tiers and applies the grade to both
 * the left stripe and the lateness text. This file is the only place that
 * decides where the thresholds sit and which token each tier gets.
 *
 * ## The tier-2 "burnt" compromise
 *
 * DENSITY.md names `#C2571F` for tier 2 — a burnt tone sitting between `--warn`
 * and `--crit`. `tokens.css` has no such token and is not ours to edit, and a
 * literal hex in a component is a defect (DESIGN.md non-negotiable #1). So the
 * tone is derived from the two tokens it sits between:
 *
 *     --color-burnt: color-mix(in srgb, var(--warn) 55%, var(--crit))
 *
 * declared once in `styles/theme.css`, the existing bridge between tokens.css
 * and Tailwind. That keeps it token-backed rather than literal, and it tracks
 * light/dark automatically because both of its inputs do. If that utility is
 * ever removed, change the two `burnt` entries below to `warn` — tier 2 then
 * shares tier 1's hue and is told apart by weight alone, which is the fallback
 * the standard permits.
 *
 * ## Static class maps only
 *
 * Every map below is written out in full. Tailwind scans source text, so a
 * class assembled at runtime (`` `text-${tone}` ``) is never emitted. That bug
 * has already bitten this repo once.
 */

import type { Tone } from "./tone";

/** 0 on time · 1 under an hour · 2 one to six hours · 3 beyond six hours. */
export type SeverityTier = 0 | 1 | 2 | 3;

/** Under an hour late is tier 1. */
const TIER_2_FROM_MINUTES = 60;
/** Six hours. At or past this, lateness is no longer a queue problem. */
const TIER_3_FROM_MINUTES = 360;
/** Above this a raw minute count stops being readable (DENSITY.md §3). */
const RAW_MINUTES_CEILING = 90;
const MINUTES_PER_HOUR = 60;

/**
 * Grade a lateness in minutes.
 *
 * Zero, negative (early) and non-finite inputs are all "on time" — a missing
 * promised-at must never be dressed up as a breach.
 */
export function lateTier(minutesLate: number): SeverityTier {
  if (!Number.isFinite(minutesLate) || minutesLate <= 0) return 0;
  if (minutesLate < TIER_2_FROM_MINUTES) return 1;
  if (minutesLate < TIER_3_FROM_MINUTES) return 2;
  return 3;
}

/**
 * Human lateness: `43m`, `6h 32m`, `11h 37m`.
 *
 * Never a raw minute count above 90 — "671 min late" is a number the reader
 * has to divide before they can act on it.
 */
export function formatLate(minutes: number): string {
  if (!Number.isFinite(minutes)) return "—";
  const whole = Math.round(minutes);
  if (whole <= 0) return "on time";
  if (whole <= RAW_MINUTES_CEILING) return `${whole}m`;

  const hours = Math.floor(whole / MINUTES_PER_HOUR);
  const rest = whole % MINUTES_PER_HOUR;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * The 3px severity rule, as a `::before` background.
 *
 * Tier 0 is deliberately empty: a rule down every row is decoration, not a
 * signal. `<SeverityCell>` skips the pseudo-element entirely at tier 0 while
 * keeping the indent, so the column still lines up.
 */
export const SEVERITY_STRIPE: Record<SeverityTier, string> = {
  0: "",
  1: "before:bg-warn",
  2: "before:bg-burnt",
  3: "before:bg-crit",
};

/**
 * The lateness text itself. Weight climbs with the tier, so the grading
 * survives greyscale, a colour-blind reader, and the burnt fallback.
 */
export const SEVERITY_TEXT: Record<SeverityTier, string> = {
  0: "text-ok",
  1: "text-warn font-medium",
  2: "text-burnt font-semibold",
  3: "text-crit font-semibold",
};

/** Soft ground for a tier, when a whole cell has to carry the grade. */
export const SEVERITY_SOFT: Record<SeverityTier, string> = {
  0: "bg-ok-soft text-ok",
  1: "bg-warn-soft text-warn",
  2: "bg-warn-soft text-burnt",
  3: "bg-crit-soft text-crit",
};

/** The nearest chip tone, for `<Badge>` and `<StatusChip>`. */
export const SEVERITY_TONE: Record<SeverityTier, Tone> = {
  0: "ok",
  1: "warn",
  2: "warn",
  3: "crit",
};

/** Words, so the grade is never carried by colour alone (DESIGN.md #3). */
export const SEVERITY_LABEL: Record<SeverityTier, string> = {
  0: "on time",
  1: "running late",
  2: "well past due",
  3: "critically late",
};
