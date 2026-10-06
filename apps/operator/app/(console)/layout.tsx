"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthSpinner } from "@repo/api-client";
import { AppShell } from "../../components/app-shell";
import { useOperatorSession } from "../../components/session-provider";

/**
 * The gate on the whole console. There is no public view here.
 *
 * A visitor with no session is sent to /login with `?next=` pointing back at
 * where they were, so the link they followed still works once they are in. The
 * redirect is a soft navigation rather than a page load, which keeps the React
 * tree and the query cache alive across the trip.
 *
 * The route group is what holds /login outside the gate while leaving every URL
 * unchanged — /live is still /live.
 *
 * Today this reads the fixture session, which is not authentication and gates
 * nothing an attacker could not read straight out of the bundle. The shape is
 * the point: when the API is behind this console, `RequireAuth` from
 * @repo/api-client replaces the four lines below and every route in the group is
 * behind a verified token and an active row in platform_staff.
 */
export default function ConsoleLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const { status } = useOperatorSession();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (status !== "signed-out") return;
    const next = encodeURIComponent(pathname);
    router.replace(pathname === "/" ? "/login" : `/login?next=${next}`);
  }, [status, pathname, router]);

  if (status === "loading") return <AuthSpinner />;
  if (status === "signed-out") return <AuthSpinner label="Taking you to sign in" />;

  // The Suspense boundary is for `useSearchParams`: the order drawer lives in
  // `?order=` on every board (lib/use-open-order.ts), and a route that reads
  // search params outside a boundary cannot be prerendered.
  return (
    <AppShell>
      <React.Suspense fallback={null}>{children}</React.Suspense>
    </AppShell>
  );
}
