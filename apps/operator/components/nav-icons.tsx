import * as React from "react";

/**
 * One glyph per section.
 *
 * Twelve sections is more than a reader will learn by label alone, and it is
 * exactly the count at which a list of names becomes a wall of text. The icons
 * are anchors: after a week the hand goes to the shape, not to the word. That is
 * also what makes the collapsed rail usable at all.
 *
 * Drawn on one 16px grid at one stroke weight, so no glyph reads heavier than
 * its neighbours. Stroked rather than filled — a filled icon beside 13px text
 * pulls more attention than a navigation item deserves.
 *
 * Every one is `aria-hidden`: the label beside it already names the section, and
 * on the collapsed rail the button carries an `aria-label`. An icon that
 * announced itself would make a screen reader say every section twice.
 */
export type NavIconName =
  | "overview"
  | "live"
  | "orders"
  | "deliveries"
  | "restaurants"
  | "applications"
  | "customers"
  | "offers"
  | "payments"
  | "refunds"
  | "revenue"
  | "reports"
  | "settings";

const PATHS: Readonly<Record<NavIconName, React.ReactNode>> = {
  /* A gauge needle: today, at a glance. */
  overview: (
    <>
      <path d="M2.5 12a5.5 5.5 0 1 1 11 0" />
      <path d="M8 12 10.8 8.6" />
    </>
  ),
  /* A heartbeat: what is in flight right now. */
  live: <path d="M1.5 8h3l2-4 2.5 8L11 8h3.5" />,
  /* A torn receipt. */
  orders: (
    <>
      <path d="M4 2h8v12l-2-1.2L8 14l-2-1.2L4 14z" />
      <path d="M6.2 5.5h3.6M6.2 8h3.6" />
    </>
  ),
  /* Two stops and the road between them. */
  deliveries: (
    <>
      <circle cx="4" cy="4" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <path d="M5.8 4H9a2.5 2.5 0 0 1 0 5H7a2.5 2.5 0 0 0 0 5h3.2" />
    </>
  ),
  /* A shopfront with its awning. */
  restaurants: (
    <>
      <path d="M2.5 6.5h11V13h-11z" />
      <path d="M2 6.5 3.6 3h8.8L14 6.5" />
      <path d="M6.4 13V9.5h3.2V13" />
    </>
  ),
  /* A form on a clipboard: a restaurant asking, not yet a restaurant. */
  applications: (
    <>
      <path d="M4 3.5h8v11H4z" />
      <path d="M6.2 2.5h3.6v2H6.2z" />
      <path d="M6.2 7.5h5.6M6.2 10h3.4" />
    </>
  ),
  customers: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <path d="M2.5 13.5c0-2 1.6-3.4 3.5-3.4s3.5 1.4 3.5 3.4" />
      <path d="M10.6 4.4a2.2 2.2 0 0 1 0 4.2M11.4 10.6c1.3.4 2.1 1.6 2.1 2.9" />
    </>
  ),
  /* A price tag. */
  offers: (
    <>
      <path d="M8.6 2.2 13.8 7.4a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4 0L2.2 8.6V3.2a1 1 0 0 1 1-1z" />
      <circle cx="5.4" cy="5.4" r=".9" />
    </>
  ),
  payments: (
    <>
      <rect x="2" y="4" width="12" height="8.5" rx="1.4" />
      <path d="M2 7h12" />
      <path d="M4.4 10.2h2.4" />
    </>
  ),
  /* A clock with an arrow off it: money owed against a promise. */
  refunds: (
    <>
      <circle cx="8" cy="8.4" r="5.4" />
      <path d="M8 5.6v3l2.1 1.3" />
      <path d="M12.6 2.2 14 3.6l-1.4 1.4" />
    </>
  ),
  revenue: (
    <>
      <path d="M2.5 13.5h11" />
      <path d="M4.6 13.5V9M7.5 13.5V5.5M10.4 13.5v-3M13.2 13.5V7" />
    </>
  ),
  /* A sheet with bars on it. */
  reports: (
    <>
      <path d="M3.5 2h6l3 3v9h-9z" />
      <path d="M9.4 2v3.2h3.1" />
      <path d="M5.8 11.6V9.4M8 11.6V7.9M10.2 11.6v-1.4" />
    </>
  ),
  settings: (
    <>
      <path d="M2.5 5h7M11.6 5h1.9M2.5 11h2M6.6 11h6.9" />
      <circle cx="10.6" cy="5" r="1.4" />
      <circle cx="5.5" cy="11" r="1.4" />
    </>
  ),
};

export function NavIcon({ name }: { readonly name: NavIconName }): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
    >
      {PATHS[name]}
    </svg>
  );
}
