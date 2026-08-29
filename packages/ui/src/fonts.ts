/* Foodishi — the "Neel" typefaces, self-hosted.
 *
 * next/font downloads these at build time and serves them from our own origin
 * with a preload link and `font-display: swap`. That replaces the remote
 * Google Fonts @import tokens.css used to carry: no third-party request on the
 * critical path, no flash of Georgia before the serif lands, and no dependency
 * on fonts.googleapis.com being reachable at runtime.
 *
 * One superfamily, three roles (DESIGN.md, Type):
 *   IBM Plex Serif — page titles only, via `font-title` / PageTitle
 *   IBM Plex Sans  — every interface surface, via `font-sans`
 *   IBM Plex Mono  — order ids, timestamps, provider refs, money
 *
 * Sans and Mono share skeletons and metrics, so a money column set in Mono
 * sits correctly beside a label set in Sans.
 *
 * Each face is exposed as a CSS variable rather than a class. tokens.css maps
 * those variables onto --font-display / --font-ui / --font-code, so components
 * keep reading tokens and never name a typeface (DESIGN.md, non-negotiable #1).
 */
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";

/* Every call below repeats `subsets` and lists its weights literally rather
 * than sharing a constant. That is a requirement, not an oversight: next/font
 * is a compile-time transform, so it rejects a spread or any other value it
 * cannot read from the source ("Unexpected spread").
 *
 * "latin" alone does not cover U+20B9. The rupee sign lives in latin-ext
 * (U+20AD-20C0) and every price in all three apps is prefixed with it, so
 * without that subset each ₹ would be drawn by a fallback face while the
 * digits beside it came from Plex. */

/** Page titles. 400 only: PageTitle sets font-normal and nothing overrides it. */
const plexSerif = IBM_Plex_Serif({
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  display: "swap",
  variable: "--font-plex-serif",
});

/** Interface text. 400/500/600/700 — the weights the apps actually use. */
const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-plex-sans",
});

/** Ids, clocks and money. 600 is the emphasised order total on a ticket. */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-mono",
});

/**
 * Put this on <html> in a root layout. It defines the three font variables on
 * the same element tokens.css reads them from (:root), so `--font-ui` and
 * friends resolve for everything underneath.
 */
export const FONT_VARIABLES = [
  plexSerif.variable,
  plexSans.variable,
  plexMono.variable,
].join(" ");
