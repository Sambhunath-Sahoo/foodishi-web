"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, Button, Thumb, cn } from "@repo/ui";
import { AccountMenu } from "./account-menu";
import { NoKitchenNotice } from "./no-kitchen";
import { RequireSession } from "./require-session";
import { SampleDataBadge } from "./sample-data";
import { ROLE_LABELS } from "../../lib/permissions";
import { KitchenProvider, isReady, useKitchen } from "../../lib/kitchen";
import type { Permission } from "../../lib/types";

interface NavItem {
  readonly href: string;
  readonly label: string;
  /**
   * The permission the destination needs. Hiding a tab is COSMETIC: the data
   * source checks the caller's own membership on every read and refuses
   * regardless of what this tablet draws. It saves a tap that could only be
   * refused — it is not what keeps anything safe.
   */
  readonly requires: Permission;
}

/**
 * The day's work. Everybody who can open this console can open all four, which
 * is what makes them one group.
 */
const SERVICE_NAV: readonly NavItem[] = [
  { href: "/", label: "Dashboard", requires: "dashboard.view" },
  { href: "/orders", label: "Orders", requires: "orders.view" },
  { href: "/handover", label: "Pickups", requires: "handover.view" },
  { href: "/menu", label: "Menu", requires: "menu.view" },
];

/**
 * Running the business. Kept as its own group, set apart by a short 1px rule.
 * It was a wider gap with no rule, and a 24px hole between Menu and Offers read
 * as a misaligned tab rather than as "two kinds of work". The rule is 20px tall
 * and sits mid-tab, so it reads as a divider, not a stray mark. For a shift
 * worker this half is simply absent.
 */
const MANAGE_NAV: readonly NavItem[] = [
  { href: "/offers", label: "Offers", requires: "offers.view" },
  { href: "/reports", label: "Reports", requires: "reports.view" },
  { href: "/payments", label: "Payments", requires: "payments.view" },
  { href: "/settings", label: "Restaurant", requires: "restaurant.view" },
  { href: "/team", label: "Team", requires: "staff.view" },
];

const LOGIN_PATH = "/login";
const APPLY_PATH = "/apply";

/**
 * The routes that must render for a signed-out browser.
 *
 * /apply is here because the person opening it does not have an account yet —
 * that is the whole point of the screen. Putting it behind RequireSession would
 * bounce every prospective restaurant to a sign-in form for credentials they
 * have not been given, which is the one visitor this console cannot afford to
 * turn away.
 */
const PUBLIC_PATHS: readonly string[] = [LOGIN_PATH, APPLY_PATH];

function isCurrent(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Which restaurant this tablet is acting for — the loudest thing in the chrome.
 *
 * Somebody who works in two restaurants can accept a ticket into the wrong one,
 * and that is a real mistake with a real customer on the other end. So the name
 * is set large in the title face beside its cover, and when there is more than
 * one to be in, the count and the way to change it sit directly beside it rather
 * than hiding at the end of the session row.
 */
function KitchenBar(): React.JSX.Element {
  const kitchen = useKitchen();

  if (!isReady(kitchen)) {
    // Three different silences, told apart: still reading, nothing to read, or
    // several to choose between.
    const label =
      kitchen.status === "no-membership"
        ? "No restaurant"
        : kitchen.status === "unselected"
          ? "Choose a restaurant"
          : "Opening your restaurant…";
    return (
      <p className="text-[17px] text-ink-3">{label}</p>
    );
  }

  const total = kitchen.restaurants.length;
  const position =
    kitchen.restaurants.findIndex((row) => row.id === kitchen.restaurant.id) + 1;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
      {/* No accent rule down the left any more — beside the cover it read as a
          stray line, and the cover already anchors the block. One gap for every
          piece, centred on one line, so the four read as one identity. */}
      <div className="flex min-w-0 items-center gap-3">
        {/* 32px: the cover turns "which restaurant am I in" into a glance rather
            than a read, which is the mistake this bar exists to prevent. */}
        <Thumb src={kitchen.restaurant.image_url} name={kitchen.restaurant.name} size={32} />
        <span
          className="truncate font-title text-[22px] leading-tight text-ink"
          title={kitchen.restaurant.name}
        >
          {kitchen.restaurant.name}
        </span>
        <span className="shrink-0 text-[14px] text-ink-3">{kitchen.restaurant.city}</span>
        <Badge tone={kitchen.role === "manager" ? "accent" : "mute"}>
          {ROLE_LABELS[kitchen.role]}
        </Badge>
        {/* A closed restaurant takes no orders at all, so an empty queue means
            two completely different things and only this badge tells them
            apart. */}
        {kitchen.restaurant.is_active ? null : <Badge tone="crit">Closed</Badge>}
      </div>

      {total > 1 ? (
        // The count is context, not a warning. It was an amber chip, which made
        // "1 of 2" compete with the restaurant name beside it — and the name,
        // set large in the title face, is what actually prevents accepting a
        // ticket into the wrong kitchen. Quiet chip, live button.
        <span className="flex items-center gap-2">
          <span className="rounded-chip border border-line bg-surface-2 px-2 py-0.5 font-sans text-[12px] whitespace-nowrap tabular-nums text-ink-3">
            {position} of {total}
          </span>
          <Button
            variant="outline"
            size="sm"
            title="Work in one of your other restaurants"
            onClick={() => kitchen.select(null)}
          >
            Change
          </Button>
        </span>
      ) : null}
    </div>
  );
}

function NavGroup({
  items,
  pathname,
}: {
  readonly items: readonly NavItem[];
  readonly pathname: string;
}): React.JSX.Element {
  return (
    <ul className="flex shrink-0 gap-1">
      {items.map((item) => {
        const current = isCurrent(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              // A tab, so a tab's indicator: a 2px accent bar along the bottom
              // edge, sitting on the header's own rule. The boxed fill it
              // replaced looked like a pressed button. The bar is shape as well
              // as colour, and aria-current carries it for a screen reader.
              className={cn(
                "relative inline-flex min-h-11 items-center rounded-t-card px-4 whitespace-nowrap",
                "font-sans text-base font-medium transition-colors",
                "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-chip",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                current
                  ? "text-accent after:bg-accent"
                  : "text-ink-2 after:bg-transparent hover:bg-surface-2 hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function KitchenNav(): React.JSX.Element {
  const pathname = usePathname();
  const kitchen = useKitchen();

  const allowed = (item: NavItem): boolean =>
    isReady(kitchen) ? kitchen.can(item.requires) : item.requires === "dashboard.view";

  const service = SERVICE_NAV.filter(allowed);
  const manage = MANAGE_NAV.filter(allowed);

  // ONE row, always. At 820 portrait the tabs wrapped onto a second line and
  // the header grew to 151px before any of the day's work. A row that runs out
  // of room scrolls inside itself, and a fade on the right edge says there is
  // more — the same rule as a wide table.
  return (
    <div className="relative min-w-0">
      <nav
        aria-label="Sections"
        className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <NavGroup items={service} pathname={pathname} />
        {manage.length > 0 ? (
          <>
            <span aria-hidden="true" className="h-5 w-px shrink-0 bg-line" />
            <NavGroup items={manage} pathname={pathname} />
          </>
        ) : null}
        {/* Room for the last tab to scroll clear of the fade. */}
        <span aria-hidden="true" className="w-6 shrink-0" />
      </nav>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent"
      />
    </div>
  );
}

/**
 * Minimal chrome on purpose: which restaurant is open, who is signed in, and
 * destinations big enough to hit with a thumb while holding a tray.
 *
 * TWO rows, and the split is by what the thing IS rather than by what it costs
 * in pixels:
 *
 *   1. Who and where — the restaurant on the left, the account on the right.
 *      Both answer "what is this tablet acting as right now", so they share a
 *      line, and the account cluster fills the space the restaurant name used
 *      to leave empty.
 *   2. Where to go — the tabs, alone, across the full width.
 *
 * It was three rows: the account controls kept wrapping onto a line of their
 * own, which left the nav row half empty, a dangling divider hanging off
 * nothing, and about 130px of header before any of the day's work. The tabs are
 * the only thing in here anybody taps mid-service; they get the room.
 *
 * The bar sticks so the restaurant name is on screen at every scroll position.
 */
/**
 * Publishes the header's real height as --partner-header-h on <html>, so
 * scroll-padding, sticky sub-rows and sticky side columns sit exactly under it
 * at every width — the height changes with the restaurant name, the account
 * row and the viewport, and a hard-coded number was wrong at one of them.
 * globals.css keeps a fallback for the first paint.
 */
function usePublishedHeaderHeight(): React.RefObject<HTMLElement | null> {
  const ref = React.useRef<HTMLElement | null>(null);
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const root = document.documentElement;
    const publish = (): void => {
      root.style.setProperty("--partner-header-h", `${element.offsetHeight}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--partner-header-h");
    };
  }, []);
  return ref;
}

function Chrome({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const kitchen = useKitchen();
  const headerRef = usePublishedHeaderHeight();

  // Works nowhere: no sections to navigate to, and no page title to hang above
  // the explanation. One honest screen instead of an empty queue.
  const hasNoKitchen = kitchen.status === "no-membership";

  return (
    <div className="flex min-h-dvh flex-col">
      <header ref={headerRef} className="sticky top-0 z-30 border-b border-line bg-surface">
        {/* 6px on top, no gap between the rows, and no bottom padding: the
            tabs sit on the header's rule, so the active tab's bar lands on it
            like a tab strip rather than floating above. Both rows are already
            44px touch targets, which is the air; the header comes to 95px on a
            landscape or portrait tablet, down from 103 and 151. */}
        <div className="mx-auto flex w-full max-w-[1240px] flex-col px-5 pt-1.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <KitchenBar />
            {/* ml-auto rather than justify-between: when the restaurant name is
                long enough to wrap, the account stays pinned right instead of
                drifting into the middle of the line. */}
            <div className="ml-auto flex shrink-0 items-center gap-2.5">
              <SampleDataBadge />
              <AccountMenu />
            </div>
          </div>

          {hasNoKitchen ? null : <KitchenNav />}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1240px] flex-1 px-5 py-5">
        {hasNoKitchen ? <NoKitchenNotice /> : children}
      </main>
    </div>
  );
}

export function AppShell({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();

  // The two routes that must render for a signed-out browser: signing in, and
  // asking to join.
  if (PUBLIC_PATHS.includes(pathname)) return <>{children}</>;

  return (
    <RequireSession>
      <KitchenProvider>
        <Chrome>{children}</Chrome>
      </KitchenProvider>
    </RequireSession>
  );
}
