"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Skeleton, Thumb } from "@repo/ui";
import { useOperatorSession } from "./session-provider";

/** The avatar in the header. Small: it identifies, it does not decorate. */
const AVATAR_PX = 26;

/**
 * Who is signed in, and the way out.
 *
 * One identity, the person at the keyboard — this is not an account switcher.
 * The name comes from the operations account rather than from an email local
 * part, because "Meera Iyer" is who the rest of the platform knows this person
 * as and "meera.iyer" is not.
 */
export function SessionBar(): React.JSX.Element {
  const { account, status, signOut } = useOperatorSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [signOutError, setSignOutError] = React.useState<string | null>(null);

  const handleSignOut = React.useCallback(async (): Promise<void> => {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
      // Nothing in the cache belongs to the next person to sign in here.
      queryClient.clear();
      router.replace("/login");
    } catch (error) {
      setIsSigningOut(false);
      setSignOutError(
        error instanceof Error && error.message !== ""
          ? error.message
          : "Sign out failed. Try again.",
      );
    }
  }, [queryClient, router, signOut]);

  return (
    <div className="flex items-center gap-3">
      {status === "loading" ? (
        <Skeleton className="h-4 w-32" label="Loading your account" />
      ) : account === null ? null : (
        <span className="flex items-center gap-2">
          <Thumb
            src={account.avatar_url}
            name={account.name}
            size={AVATAR_PX}
            shape="circle"
          />
          <span className="flex flex-col items-end leading-tight">
            <span className="font-sans text-[13px] font-medium text-ink">
              {account.name}
            </span>
            <span className="font-mono text-[11px] text-ink-3">{account.email}</span>
          </span>
        </span>
      )}
      {signOutError !== null ? (
        <span className="font-sans text-[11px] text-crit">{signOutError}</span>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        isPending={isSigningOut}
        pendingLabel="Signing out…"
        onClick={() => void handleSignOut()}
      >
        Sign out
      </Button>
    </div>
  );
}
