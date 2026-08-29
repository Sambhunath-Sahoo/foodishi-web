/**
 * Tones are the only vocabulary a component uses to ask for colour. Nothing
 * outside this file decides which token a state gets.
 */
export type Tone = "accent" | "ok" | "warn" | "crit" | "cool" | "mute";

/** Solid text + soft ground + a border, for chips and banners. */
export const TONE_SOFT: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent border-accent/25",
  ok: "bg-ok-soft text-ok border-ok/25",
  warn: "bg-warn-soft text-warn border-warn/25",
  crit: "bg-crit-soft text-crit border-crit/25",
  cool: "bg-cool-soft text-cool border-cool/25",
  mute: "bg-mute-soft text-mute border-mute/25",
};

/** The dot that carries the meaning when colour cannot (DESIGN.md #3). */
export const TONE_DOT: Record<Tone, string> = {
  accent: "bg-accent",
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  cool: "bg-cool",
  mute: "bg-mute",
};

/** The 3px severity stripe down the leading edge of an urgent row. */
export const TONE_STRIPE: Record<Tone, string> = {
  accent: "before:bg-accent",
  ok: "before:bg-ok",
  warn: "before:bg-warn",
  crit: "before:bg-crit",
  cool: "before:bg-cool",
  mute: "before:bg-mute",
};

/** Text colour for a tone — used by SVG that paints with `currentColor`. */
export const TONE_TEXT: Record<Tone, string> = {
  accent: "text-accent",
  ok: "text-ok",
  warn: "text-warn",
  crit: "text-crit",
  cool: "text-cool",
  mute: "text-mute",
};

/** Fill for meters and bars. */
export const TONE_FILL: Record<Tone, string> = {
  accent: "bg-accent",
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  cool: "bg-cool",
  mute: "bg-mute",
};

/**
 * The same stripe, painted on a table row's first cell. Written out in full
 * because Tailwind scans source text — a class assembled at runtime is never
 * generated.
 */
export const TONE_ROW_STRIPE: Record<Tone, string> = {
  accent: "[&>td:first-child]:before:bg-accent",
  ok: "[&>td:first-child]:before:bg-ok",
  warn: "[&>td:first-child]:before:bg-warn",
  crit: "[&>td:first-child]:before:bg-crit",
  cool: "[&>td:first-child]:before:bg-cool",
  mute: "[&>td:first-child]:before:bg-mute",
};
