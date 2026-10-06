"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui";
import { QueryError } from "./data-states";
import { useAccount } from "../lib/use-account";
import { beginSignOut, cancelSignOut } from "../lib/sign-out-intent";

/**
 * The way out, on the account screen rather than in the header — see
 * AccountMenu for why. Lands on Discover signed out, not on /login: someone
 * who just chose to leave has not asked to sign in again.
 *
 * Outlined, not filled: it is not the primary thing on this screen, and the
 * filled Save button above it should keep that weight.
 */
export function SignOutButton(): React.JSX.Element {
  const router = useRouter();
  const { signOut } = useAccount();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [failure, setFailure] = React.useState<unknown>(null);

  function handleSignOut(): void {
    setIsSigningOut(true);
    setFailure(null);
    // Tells <RequireAccount> around this screen that the session ending is
    // the point, so it sends the customer to "/" and not to /login.
    beginSignOut();
    void (async () => {
      try {
        await signOut();
        router.replace("/");
      } catch (error) {
        // Still signed in, so the gate must not treat a later expiry as this.
        cancelSignOut();
        setFailure(error);
      } finally {
        setIsSigningOut(false);
      }
    })();
  }

  return (
    <div className="flex flex-col gap-3">
      {failure !== null ? (
        <QueryError title="Could not sign you out" error={failure} />
      ) : null}
      <Button
        variant="outline"
        size="lg"
        block
        // `lg` keys its sm:w-auto off the browser, not the 480px column.
        className="sm:w-full"
        onClick={handleSignOut}
        isPending={isSigningOut}
        pendingLabel="Signing out…"
      >
        Sign out
      </Button>
    </div>
  );
}
