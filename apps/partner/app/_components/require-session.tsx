"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthSpinner } from "@repo/api-client";
import { ErrorBanner } from "@repo/ui";
import { useSession } from "../../lib/session";

/**
 * The gate every signed-in screen sits behind: a spinner while the session is
 * read, a redirect to /login when there is none, children when there is.
 *
 * Written here rather than reused from @repo/api-client because that one is
 * wired to Supabase directly, and this console reads its session through the
 * service layer so the same screens run against bundled JSON.
 *
 * `next` carries where they were going, so a tablet that timed out mid-service
 * comes back to the ticket it was on rather than to the dashboard.
 */
const LOGIN_PATH = "/login";

/**
 * Where an account with no Foodishi profile is sent.
 *
 * /apply, not /login: signing in again would land them right back here, because
 * the missing thing is a form and not a session. That screen owns both halves of
 * sign-up, so it is the one place that can finish this.
 */
const APPLY_PATH = "/apply";

export function RequireSession({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { status, error } = useSession();

  const destination =
    pathname === "/" ? LOGIN_PATH : `${LOGIN_PATH}?next=${encodeURIComponent(pathname)}`;

  // Redirecting during render is a React error; this is the effect that owns it.
  React.useEffect(() => {
    if (error != null) return;
    if (status === "unauthenticated") router.replace(destination);
    // No `next` on this one: what they were reaching for needs a kitchen, and an
    // account this far from having one would only bounce back.
    if (status === "unlinked") router.replace(APPLY_PATH);
  }, [status, error, router, destination]);

  if (status === "loading") return <AuthSpinner label="Checking your session" />;

  // A session read that FAILED is not the same as no session, and sending
  // somebody to a sign-in screen because the source was unreachable would hide
  // the only sentence that explains it.
  if (error != null) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-5 py-10">
        <ErrorBanner
          title="Could not check who is signed in"
          message={error instanceof Error ? error.message : "The session could not be read."}
        />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <AuthSpinner label="Taking you to sign in" />;
  }

  if (status === "unlinked") {
    return <AuthSpinner label="Finishing your account" />;
  }

  return <>{children}</>;
}
