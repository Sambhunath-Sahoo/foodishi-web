"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/ui";
import { ThemeSwitcher } from "@repo/ui";
import { AccountMenu } from "./account-menu";
import { useCart } from "../lib/cart";

/**
 * Phone chrome: a thin brand bar at the top, a thumb-reachable tab bar at the
 * bottom. Targets are 44px+ because this is read one-handed at 390px.
 */
const TABS = [
  { href: "/", label: "Discover", match: (path: string) => path === "/" || path.startsWith("/r/") },
  { href: "/favorites", label: "Saved", match: (path: string) => path.startsWith("/favorites") },
  { href: "/cart", label: "Cart", match: (path: string) => path.startsWith("/cart") || path.startsWith("/checkout") },
  { href: "/orders", label: "Orders", match: (path: string) => path.startsWith("/orders") },
] as const;

export function AppShell({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const { itemCount, isReady } = useCart();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-3 px-4 py-2.5">
          <Link
            href="/"
            className="font-title text-2xl leading-none text-ink no-underline"
          >
            Foodishi
          </Link>
          <div className="flex items-center gap-2">
            {/* Compact at 390px — three labelled options would push the
                account menu off the edge on a phone. */}
            <ThemeSwitcher compact />
            <React.Suspense fallback={null}>
              <AccountMenu />
            </React.Suspense>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pt-4 pb-28">
        {children}
      </main>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface"
      >
        <ul className="mx-auto flex w-full max-w-[560px] items-stretch">
          {TABS.map((tab) => {
            const isCurrent = tab.match(pathname);
            const showCount = tab.href === "/cart" && isReady && itemCount > 0;
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2",
                    "text-[12px] font-medium no-underline transition-colors",
                    isCurrent ? "text-accent" : "text-ink-3 hover:text-ink-2",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {tab.label}
                    {showCount ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-chip bg-accent px-1.5 py-0.5 text-[11px] tabular-nums text-on-accent">
                        {itemCount}
                      </span>
                    ) : null}
                  </span>
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
