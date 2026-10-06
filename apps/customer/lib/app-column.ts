/**
 * The customer app is a phone app at every viewport. On a desktop browser it is
 * that same phone column, centred: the header, the content, the tab bar and
 * every fixed action bar share one width, and from 481px up the column gets a
 * hairline edge so it reads as the app sitting on the page rather than a page
 * that forgot to grow. Anything `fixed inset-x-0` must take APP_COLUMN too, or
 * it stretches edge to edge on a desktop.
 */
export const APP_COLUMN = "mx-auto w-full max-w-[480px]";
export const APP_COLUMN_EDGE = "min-[481px]:border-x min-[481px]:border-line";

/**
 * The tab bar's height lives in ONE place — `--tab-bar-h` in app/globals.css —
 * because three things have to agree on it: the bar itself, every action bar
 * that sits on top of it, and the padding that keeps the last thing on a page
 * clear of it. They used to hard-code 56px each, so giving the tabs an icon
 * would have slid every action bar under them. The safe-area inset is the
 * home indicator on a notched phone; without it the bar sits under the swipe.
 */
export const ABOVE_TAB_BAR = "bottom-[calc(var(--tab-bar-h)+env(safe-area-inset-bottom))]";

/** Bottom padding for <main>: the tab bar, the home indicator and 16px of air. */
export const CLEAR_TAB_BAR = "pb-[calc(var(--tab-bar-h)+env(safe-area-inset-bottom)+16px)]";

/**
 * Directly under the sticky app header (`--app-header-h` in app/globals.css,
 * which the header also takes as its height). For a second sticky row, like
 * the menu's category chips, so it docks against the header rather than
 * sliding under it.
 */
export const BELOW_APP_HEADER = "top-[var(--app-header-h)]";

/**
 * A dialog panel that fits inside the phone column (480px less its 16px
 * gutters). The shared Dialog defaults to 32rem, wider than the whole app on a
 * desktop browser.
 */
export const APP_DIALOG = "w-[min(448px,calc(100vw-2rem))]";
