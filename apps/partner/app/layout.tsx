import type { Metadata, Viewport } from "next";
import { ApiProvider } from "@repo/api-client";
import { THEME_INIT_SCRIPT } from "@repo/ui";
import { FONT_VARIABLES } from "@repo/ui/fonts";
import { AppShell } from "./_components/app-shell";
import { SessionProvider } from "../lib/session";
import "@repo/ui/styles/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foodishi Restaurant",
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
        <ApiProvider>
          <SessionProvider>
            <AppShell>{children}</AppShell>
          </SessionProvider>
        </ApiProvider>
      </body>
    </html>
  );
}
