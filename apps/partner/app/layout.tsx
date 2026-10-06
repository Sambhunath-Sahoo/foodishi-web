import type { Metadata, Viewport } from "next";
import { ApiProvider } from "@repo/api-client";
import { THEME_INIT_SCRIPT } from "@repo/ui";
import { FONT_VARIABLES } from "@repo/ui/fonts";
import { AppShell } from "./_components/app-shell";
import { SessionProvider } from "../lib/session";
import "@repo/ui/styles/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  // Every route names itself ("Orders · Foodishi Restaurant"), so a reader with
  // several tabs open can tell them apart. The default is for the few routes
  // that cannot: the home page, which shares this segment and so never gets
  // the template, and anything Next renders without a page of its own.
  title: { template: "%s · Foodishi Restaurant", default: "Foodishi Restaurant" },
  description:
    "Restaurant console — the live order queue, the menu, the team, offers, reports and settlements.",
};

export const viewport: Viewport = {
  // Read at two feet on a tablet, hands busy.
  initialScale: 1,
  width: "device-width",
  // No literal colour here: the tokens own the palette, and the metadata API
  // takes a value rather than a CSS variable. Declaring the scheme lets the
  // browser paint its chrome from tokens.css instead.
  colorScheme: "light dark",
};

/**
 * `ApiProvider` is the TanStack query client and nothing else — it is named for
 * the package it lives in, not for a backend. Every read below it goes through
 * `lib/services`, so the same tree runs on bundled JSON or on the live API.
 *
 * `SessionProvider` is this app's own, for the same reason: the one in
 * @repo/api-client is Supabase plus GET /me and cannot answer without a server.
 */
export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  // suppressHydrationWarning on <html> is REQUIRED here, not cosmetic.
  // THEME_INIT_SCRIPT below writes data-theme onto that element before React
  // hydrates, which is the whole point of it -- the alternative is a light frame
  // that snaps to dark. But the server rendered no such attribute, so hydration
  // sees one it did not emit and reports "a tree hydrated but some attributes of
  // the server rendered HTML didn't match", on every single page load.
  //
  // The operator app already had this and these two did not, which is why the
  // console was clean there and noisy here for the same theme script.
  //
  // A JS comment rather than a JSX one: <html> is the single root this returns,
  // and a {/* */} beside it would need a fragment wrapper around the document.
  return (
    <html lang="en" className={FONT_VARIABLES} suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint. Without it the page renders light
            for one frame and snaps to dark — worst for the people who chose
            dark on purpose. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
          <SessionProvider>
            <AppShell>
              {/* The skip link's target. It wraps the page rather than sitting on
                  the shell's <main> because /login and /apply render without the
                  shell, and they need a target too. tabIndex -1 is what makes the
                  jump move focus and not just scroll; outline-none because a ring
                  round the whole page says nothing the next Tab does not. */}
              <div id="main" tabIndex={-1} className="outline-none">
                {children}
              </div>
            </AppShell>
          </SessionProvider>
        </ApiProvider>
      </body>
    </html>
  );
}
