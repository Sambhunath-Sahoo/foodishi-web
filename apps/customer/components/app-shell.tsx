"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/ui";
import { AccountMenu } from "./account-menu";
import { useCart } from "../lib/cart";
import { TabIcon, type TabIconName } from "./tab-icons";
import { APP_COLUMN, APP_COLUMN_EDGE, CLEAR_TAB_BAR } from "../lib/app-column";

/**
 * Phone chrome: a thin brand bar at the top, a thumb-reachable tab bar at the
 * bottom. Targets are 44px+ because this is read one-handed at 390px.
 */
const TABS: readonly {
  readonly href: string;
  readonly label: string;
  readonly icon: TabIconName;
  readonly match: (path: string) => boolean;
}[] = [
  { href: "/", label: "Discover", icon: "discover", match: (path: string) => path === "/" || path.startsWith("/r/") },
  { href: "/favorites", label: "Saved", icon: "saved", match: (path: string) => path.startsWith("/favorites") },
  { href: "/cart", label: "Cart", icon: "cart", match: (path: string) => path.startsWith("/cart") || path.startsWith("/checkout") },
  { href: "/orders", label: "Orders", icon: "orders", match: (path: string) => path.startsWith("/orders") },
];

export function AppShell({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const { itemCount, isReady } = useCart();

  return (
    <div className={cn(APP_COLUMN, APP_COLUMN_EDGE, "flex min-h-dvh flex-col")}>
      <header className="sticky top-0 z-30 h-[var(--app-header-h)] border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-1.5">
          <Link
            href="/"
            className="flex min-h-11 shrink-0 items-center font-title text-2xl leading-none text-ink no-underline"
          >
            Foodishi
          </Link>
          {/* One control on the right, at every width. The theme switcher
              used to sit here too: three 22px icons that overflowed 390px and
              competed with the account for a bar seen on every screen. It lives
              on /profile under Appearance now, where Swiggy and Zomato keep
              theirs. */}
          <div className="flex min-w-0 items-center">
            <React.Suspense fallback={null}>
              <AccountMenu />
            </React.Suspense>
          </div>
        </div>
      </header>

      {/* The bottom padding is the tab bar, the home indicator and 16px, read
          from the same --tab-bar-h the bar uses. A flat pb-28 left "Sign out",
          the last thing on /profile, under the bar at full scroll. */}
      <main className={cn("w-full flex-1 px-4 pt-4", CLEAR_TAB_BAR)}>
        {children}
      </main>

      <nav
        aria-label="Sections"
        className={cn(
          APP_COLUMN,
          APP_COLUMN_EDGE,
          "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface",
          "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        <ul className="flex w-full items-stretch">
          {TABS.map((tab) => {
            const isCurrent = tab.match(pathname);
            const showCount = tab.href === "/cart" && isReady && itemCount > 0;
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "flex h-[var(--tab-bar-h)] flex-col items-center justify-center gap-0.5 px-2",
                    "text-[12px] font-medium no-underline transition-colors",
                    isCurrent ? "text-accent" : "text-ink-3 hover:text-ink-2",
                  )}
                >
                  {/* The count rides on the icon's corner, so the label never
                      shifts sideways when the cart fills. */}
                  <span className="relative">
                    <TabIcon name={tab.icon} />
                    {showCount ? (
                      <span className="absolute -top-1.5 left-4 inline-flex min-w-5 items-center justify-center rounded-chip bg-accent px-1.5 py-0.5 text-[11px] leading-none tabular-nums text-on-accent">
                        {itemCount}
                      </span>
                    ) : null}
                  </span>
                  <span>{tab.label}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-0.5 w-6 rounded-chip",
                      isCurrent ? "bg-accent" : "bg-transparent",
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
