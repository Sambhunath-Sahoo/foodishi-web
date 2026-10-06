"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AuthSpinner, RequireAuth } from "@repo/api-client";
import { Card, CardBody, CardHeader, CardTitle, PageTitle } from "@repo/ui";
import { QueryError } from "./data-states";
import { ProfileLinkForm } from "./profile-link-form";
import { useAccount } from "../lib/use-account";
import { isFixtureSource } from "../lib/services";
import { toLoginHref } from "../lib/next-path";
import { takeSignOutIntent } from "../lib/sign-out-intent";

/**
 * The gate on /checkout, /orders and /orders/[id].
 *
 * Two things have to be true before a personal screen renders: there is a
 * Supabase session, and that session is joined to a `public.users` profile.
 * `RequireAuth` covers the first and bounces to /login carrying ?next=, so
 * nobody loses the page — or the cart — they were on. The second is the
 * signup gap: a valid token whose GET /me still 404s, which is a form to
 * fill rather than an error to show.
 */
export function RequireAccount({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();

  // A soft replace keeps the React tree — and therefore the in-memory cart —
  // alive across the bounce to /login. A sign-out the customer asked for is
  // not a lost session, so it goes to Discover instead (lib/sign-out-intent).
  const redirect = React.useCallback(
    (destination: string) =>
      router.replace(takeSignOutIntent() ? "/" : destination),
    [router],
  );

  // The fixture source has no Supabase session for RequireAuth to check, so
  // the fixture identity is the gate instead. Same contract: signed out means
  // a bounce to /login carrying ?next=, so nobody loses the page or the cart.
  // The Suspense boundary is not optional: FixtureGate reads useSearchParams,
  // and prerendering a page that does so without one fails the build. RequireAuth
  // supplies its own on the API path.
  if (isFixtureSource) {
    return (
      <React.Suspense fallback={<AuthSpinner label="Loading your account" />}>
        <FixtureGate>{children}</FixtureGate>
      </React.Suspense>
    );
  }

  return (
    <RequireAuth onRedirect={redirect}>
      <ProfileGate>{children}</ProfileGate>
    </RequireAuth>
  );
}

function FixtureGate({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSignedIn, isReady } = useAccount();

  const query = searchParams.toString();
  const here = query === "" ? pathname : `${pathname}?${query}`;

  React.useEffect(() => {
    if (!isReady || isSignedIn) return;
    router.replace(takeSignOutIntent() ? "/" : toLoginHref(here));
  }, [isReady, isSignedIn, here, router]);

  if (!isReady) return <AuthSpinner label="Loading your account" />;
  if (!isSignedIn) return <AuthSpinner label="Taking you to sign in" />;
  return <>{children}</>;
}

function ProfileGate({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const { email, profileStatus, profileError, needsProfileLink } = useAccount();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const onLinked = React.useCallback(() => {
    // Land back exactly where they were, query string included.
    const query = searchParams.toString();
    router.replace(query === "" ? pathname : `${pathname}?${query}`);
  }, [pathname, router, searchParams]);

  if (profileStatus === "idle" || profileStatus === "loading") {
    return <AuthSpinner label="Loading your account" />;
  }

  if (needsProfileLink) {
    return (
      <div className="flex flex-col gap-5">
        <PageTitle subtitle="One step left">Finish your account</PageTitle>
        <Card>
          <CardHeader>
            <CardTitle>Tell us where to deliver</CardTitle>
          </CardHeader>
          <CardBody className="py-4">
            {profileError !== null ? (
              <p className="mb-4 text-[13px] text-ink-3">{profileError.detail}</p>
            ) : null}
            <ProfileLinkForm email={email} onLinked={onLinked} />
          </CardBody>
        </Card>
      </div>
    );
  }

  if (profileStatus === "error") {
    return (
      <div className="flex flex-col gap-5">
        <PageTitle>Your account</PageTitle>
        <QueryError title="Could not load your account" error={profileError} />
      </div>
    );
  }

  return <>{children}</>;
}
