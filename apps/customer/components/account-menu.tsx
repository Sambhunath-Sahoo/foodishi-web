"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Skeleton, Thumb, buttonVariants, cn } from "@repo/ui";
import { useAccount } from "../lib/use-account";
import { toLoginHref } from "../lib/next-path";

/**
 * The header's identity control. Signed out it is a link to /login that
 * remembers the current page; signed in it is your photo and name, and one tap
 * into /profile.
 *
 * ONE CONTROL, NOT THREE. This used to hold the photo, the name AND a Sign out
 * button, which at 390px pushed the header 10px past the edge of the screen.
 * Swiggy and Zomato settle it the same way: the header is a way into the
 * account, and the account screen is where you leave — signing out is rare,
 * and a rare action does not get space in a bar seen on every screen.
 */
export function AccountMenu(): React.JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSignedIn, isReady, displayName, email, avatarUrl, status } =
    useAccount();

  // Never offer to come back to the auth screens themselves.
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const query = searchParams.toString();
  const here = query === "" ? pathname : `${pathname}?${query}`;

  if (status === "loading") {
    return <Skeleton className="h-8 w-24" label="Checking your session" />;
  }

  if (!isSignedIn) {
    if (isAuthRoute) return <span className="text-[12px] text-ink-3">Foodishi</span>;
    return (
      <Link
        href={toLoginHref(here)}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-11 px-4 no-underline",
        )}
      >
        Sign in
      </Link>
    );
  }

  const label = isReady ? (displayName ?? email ?? "Signed in") : email ?? "Signed in";
  const isOnProfile = pathname === "/profile";

  return (
    // The control is the photo alone: a name squeezed beside the logo
    // truncated to a few letters and said less than the initials do. It used to
    // join the photo from `sm` up, but that breakpoint is the browser's width
    // and this app is a 480px column at every width, so a desktop showed a
    // header the phone never does. The aria-label carries the name. Initials
    // are the ordinary state here — most customers have no avatar.
    <Link
      href="/profile"
      aria-label={`Your account, signed in as ${label}`}
      aria-current={isOnProfile ? "page" : undefined}
      title={email ?? undefined}
      className="flex min-h-11 min-w-11 items-center justify-center rounded-chip no-underline hover:bg-surface-2"
    >
      <Thumb src={avatarUrl} name={label} size={36} shape="circle" />
    </Link>
  );
}
