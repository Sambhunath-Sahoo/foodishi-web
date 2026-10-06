import * as React from "react";

/**
 * The four tab glyphs, drawn inline at 24px in `currentColor`, so they take
 * the tab's own text colour in both themes and carry no colour of their own.
 *
 * Inline rather than an icon package: four outlines do not justify a
 * dependency, and an <img> could not inherit the selected tab's accent.
 * Decorative, because the label under each one already names the tab.
 */
export type TabIconName = "discover" | "saved" | "cart" | "orders";

const PATHS: Record<TabIconName, React.ReactNode> = {
  discover: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  saved: (
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  ),
  cart: (
    <>
      <path d="M5 8h14l-1.2 11.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 8Z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </>
  ),
  orders: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
};

export function TabIcon({ name }: { readonly name: TabIconName }): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6 shrink-0"
    >
      {PATHS[name]}
    </svg>
  );
}
