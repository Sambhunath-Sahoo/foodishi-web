/**
 * The deck: how a page fills the console's viewport.
 *
 * `AppShell` gives every page a definite height on a desktop, so a board can
 * fill what it is given rather than each screen guessing a pixel maximum. Two
 * class strings carry that, in one place so they cannot drift apart:
 *
 *   DECK_PAGE   the page root — a full-height column of panels
 *   DECK_PANEL  the panel that gives up its height first when the deck is full
 *
 * `DECK_PANEL` is written for `<DataTableScroll>`, whose documented shape is a
 * flex column of "scroller, then footer".
 *
 * It **shrinks, and never grows** — but only so far. A flex item defaults to
 * `flex: 0 1 auto`, so the frame is exactly as tall as its rows when they fit:
 * eight rows draw an eight-row panel, not an eight-row panel inside 600px of
 * empty ground. When the rows outrun the viewport the panel is the one child
 * that gives way, and its rows scroll inside it against the sticky header.
 *
 * The floor is `min-h-[228px]`, not zero. It used to be `min-h-0`, and on a
 * deck whose upper bands were already tall (Overview at 1366×768) the panel
 * gave way all the way down to a 0px scroller — a table with eight rows that
 * showed none of them (OP-1). 228px is the 32px header, four 38px rows and the
 * footer: past that the deck stops squeezing and `<main>` scrolls instead,
 * which is the honest trade on a short screen. The scroller keeps `min-h-0` so
 * the frame, not its contents, decides the height.
 *
 * Written out in full: Tailwind scans source text, so a class assembled at
 * runtime never reaches the stylesheet.
 */

/** Page root. Below `md` the shell scrolls normally and `h-full` is inert. */
export const DECK_PAGE = "flex h-full min-h-0 flex-col gap-3";

/** The one panel per page that gives up its height when the deck runs out. */
export const DECK_PANEL = "min-h-[228px] [&>div:first-child]:min-h-0";

/**
 * The wrapper a `StatRail` needs on a deck page.
 *
 * A flex item's automatic minimum size is its content — which is what stops
 * the title and the toolbar from ever being squashed. `StatRail` scrolls
 * sideways on a narrow screen, and `overflow-x: auto` turns that automatic
 * minimum into zero, so on a full deck the rail is the one band that will
 * happily collapse to a sliver of clipped digits. `shrink-0` says out loud
 * that the numbers are not the thing that gives way; the rows are.
 */
export const DECK_RAIL = "shrink-0";
