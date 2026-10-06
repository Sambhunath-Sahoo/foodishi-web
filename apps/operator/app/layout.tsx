import type { Metadata, Viewport } from "next";
import { ApiProvider } from "@repo/api-client";
import { THEME_INIT_SCRIPT } from "@repo/ui";
import { FONT_VARIABLES } from "@repo/ui/fonts";
import "@repo/ui/styles/tokens.css";
import "./globals.css";
import { NAV_INIT_SCRIPT } from "../lib/nav-collapse";
import { OperatorSessionProvider } from "../components/session-provider";

export const metadata: Metadata = {
  // Every route names itself ("Orders · Foodishi Operator"), so a reader with
  // several tabs open can tell them apart. The default is for the routes that
  // cannot: the overview, whose page and nearest layout are both client
  // components and so cannot export metadata, and anything Next renders
  // without a page of its own.
  title: { template: "%s · Foodishi Operator", default: "Foodishi Operator" },
  description:
    "Internal operations console — orders, deliveries, refund SLAs, offers, payments and platform settings across every kitchen.",
};

export const viewport: Viewport = {
  // No literal colour here: the tokens own the palette, and the metadata
  // API takes a value rather than a CSS variable. Declaring the scheme
  // lets the browser paint its chrome from tokens.css instead.
  colorScheme: "light dark",
};

/**
 * The root holds the two providers and nothing else. The console chrome — the
 * header, the section rail — lives in app/(console)/layout.tsx behind the
 * session gate, so /login renders on a bare page with no signed-in furniture.
 *
 * `ApiProvider` is here for its query client and its retry policy, not for the
 * network: while the console is UI-only every hook reads `lib/services`, which
 * answers out of bundled JSON. `OperatorSessionProvider` stands in for the
 * package's own `SessionProvider` for the same reason — see the note on it.
 */
export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    // The script below stamps data-theme on this element before React ever
    // runs, so the server's markup and the hydrated markup differ on purpose.
    // Suppressing the warning here is what keeps the console's only real
    // console error from being one the reader can do nothing about.
    <html lang="en" className={FONT_VARIABLES} suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint. Without it the page renders
            light for one frame and snaps to dark — worst for the people who
            chose dark on purpose. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* The same trick for the section rail's width, for the same reason:
            a rail that snapped from 236px to 60px after hydration would flash
            on every navigation. See lib/nav-collapse.ts. */}
        <script dangerouslySetInnerHTML={{ __html: NAV_INIT_SCRIPT }} />
      </head>
      {/* suppressHydrationWarning here as well as on <html>, because React only
          suppresses ONE level and browser extensions write their attributes onto
          <body>. ColorZilla adds cz-shortcut-listen="true", Grammarly adds two
          of its own, and each one is reported as "a tree hydrated but some
          attributes of the server rendered HTML didn't match" — an error nobody
          can act on, on a page that is fine, which trains people to ignore the
          console where a real mismatch would appear. */}
      <body
        className="min-h-dvh bg-bg font-sans text-ink antialiased"
        suppressHydrationWarning
      >
        {/* The first thing a keyboard reaches, so nobody has to tab through the
            whole header and section rail on every page to get to the work. A
            plain <a>, not next/link: it is an in-page jump, and it has to work
            before hydration too. Hidden until focused, then pinned above the
            sticky header (z-30) in the same accent ring every control uses. The
            padding is focus: too, because not-sr-only resets padding to 0. */}
        <a
          href="#main"
          className="sr-only rounded-card border border-line-2 bg-surface font-sans text-[13px] font-medium text-accent shadow-card focus:not-sr-only focus:fixed focus:px-3 focus:py-2 focus:top-3 focus:left-3 focus:z-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Skip to content
        </a>
        <ApiProvider>
          <OperatorSessionProvider>{children}</OperatorSessionProvider>
        </ApiProvider>
      </body>
    </html>
  );
}
