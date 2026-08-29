"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Skeleton, Thumb, buttonVariants, cn } from "@repo/ui";
import { useAccount } from "../lib/use-account";
import { toLoginHref } from "../lib/next-path";

/**
 * The header's identity control — a real one. Signed out it is a link to
 * /login that remembers the current page; signed in it is your photo, who you
 * are, a way into /profile and the way out. This replaces the phase-1 dev
 * identity switcher, which the API no longer honours.
 */
export function AccountMenu(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSignedIn, isReady, displayName, email, avatarUrl, status, signOut } =
    useAccount();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  // Never offer to come back to the auth screens themselves.
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const query = searchParams.toString();
  const here = query === "" ? pathname : `${pathname}?${query}`;

  function handleSignOut(): void {
    setIsSigningOut(true);
    void (async () => {
      try {
        await signOut();
        router.replace("/");
      } finally {
        setIsSigningOut(false);
      }
    })();
  }

  if (status === "loading") {
    return <Skeleton className="h-8 w-24" label="Checking your session" />;
  }

  if (!isSignedIn) {
    if (isAuthRoute) return <span className="text-[12px] text-ink-3">Foodishi</span>;
    return (
      <Link
        href={toLoginHref(here)}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "no-underline")}
      >
        Sign in
      </Link>
    );
  }

  const label = isReady ? (displayName ?? email ?? "Signed in") : email ?? "Signed in";

  return (
    <div className="flex min-w-0 items-center gap-1">
      {/* The photo is the tap target as much as the name is: at 390px a 12px
          label alone is a poor one, and the circle gives the account screen a
          landmark the three-tab bar has no room for. Initials are the ordinary
          state here — most customers have no avatar. */}
      <Link
        href="/profile"
        aria-label={`Your account, signed in as ${label}`}
        title={email ?? undefined}
        className="flex min-h-9 min-w-0 items-center gap-2 rounded-card px-1 no-underline hover:bg-surface-2"
      >
        <Thumb src={avatarUrl} name={label} size={24} shape="circle" />
        <span className="min-w-0 truncate text-[12px] text-ink-3">{label}</span>
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "shrink-0 px-2",
        )}
      >
        {isSigningOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
