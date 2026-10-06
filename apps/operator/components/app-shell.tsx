import * as React from "react";
import Link from "next/link";
import { Badge, ThemeSwitcher } from "@repo/ui";
import { services } from "../lib/services";
import { Nav } from "./nav";
import { SessionBar } from "./session-bar";

/**
 * Dense two-column console: a fixed section rail and one deck of work.
 *
 * On a desktop the shell owns the viewport — `h-dvh` with the overflow
 * contained — so a page is a deck rather than a document. That is what makes
 * "nothing below the fold" structural: a board fills the height it is given
 * and scrolls its own rows, instead of every screen tuning a pixel maximum and
 * leaving a band of dead space under a short table.
 *
 * Below `md` the same markup falls back to ordinary page scrolling, because a
 * locked viewport with a stacked nav has nowhere to put the rows.
 *
 * Only ever rendered inside app/(console)/layout.tsx, which means everything
 * below is already behind a verified session.
 */
export function AppShell({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex min-h-dvh flex-col md:h-dvh md:min-h-0 md:overflow-hidden">
      <header className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2">
        <div className="flex items-baseline gap-3">
          <Link
            href="/"
            className="font-title text-xl leading-none text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Foodishi
          </Link>
          <span className="font-sans text-[11px] font-semibold tracking-widest uppercase text-ink-3">
            Operations
          </span>
          {/* Said out loud, on every screen. Nothing in this console is a live
              figure yet, and an operator who mistook one of these numbers for
              tonight's takings would be making a real decision on a fixture. */}
          {services.sourceName === "fixtures" ? (
            <Badge
              tone="warn"
              title="Every figure in this console comes from bundled sample data. Nothing here is read from a live system, and nothing you change leaves this browser."
            >
              Sample data
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher compact />
          <SessionBar />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* The rail owns its own width: it can be collapsed, and the width is
            driven by an attribute on <html> rather than by React state. */}
        <Nav />
        {/* id="main" is the skip link's target (app/layout.tsx). It sits on
            <main> itself, not a wrapper, because every deck page is a direct
            flex child of this element. tabIndex -1 lets the jump move focus
            here; outline-none because a ring round the whole deck says
            nothing the next Tab does not. */}
        <main
          id="main"
          tabIndex={-1}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-4 py-5 outline-none md:px-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
