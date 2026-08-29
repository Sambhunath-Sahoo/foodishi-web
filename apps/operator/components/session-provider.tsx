"use client";

import * as React from "react";
import { services } from "../lib/services";
import type { OperatorAccount } from "../lib/services/types";

/**
 * Who is signed in, held above the whole console.
 *
 * This replaces @repo/api-client's `SessionProvider` for as long as the console
 * is UI-only. It is deliberately the same shape — a status, an account, a sign
 * in and a sign out — so the swap back to a verified bearer token is one import
 * in app/layout.tsx and one in the console gate. Nothing below reads
 * localStorage or knows what a fixture is.
 *
 * `loading` is a real state and not a shade of signed-out. Without it every
 * refresh paints the sign-in screen for one frame before the stored session is
 * read back, which is worst for the person who is already signed in.
 *
 * It is NOT authentication. `lib/services/fixtures/session.ts` says so at
 * length and says why.
 */
export type SessionStatus = "loading" | "signed-in" | "signed-out";

export interface OperatorSessionValue {
  readonly status: SessionStatus;
  /** Null while loading and when signed out. */
  readonly account: OperatorAccount | null;
  readonly signIn: (email: string, passphrase: string) => Promise<OperatorAccount>;
  readonly signOut: () => Promise<void>;
}

const SessionContext = React.createContext<OperatorSessionValue | null>(null);

export function OperatorSessionProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const [status, setStatus] = React.useState<SessionStatus>("loading");
  const [account, setAccount] = React.useState<OperatorAccount | null>(null);

  // Resolved on the client only: the stored session lives in this browser, so
  // the server has nothing to say about it and must not guess.
  React.useEffect(() => {
    let isCurrent = true;
    void services.session.current().then((found) => {
      if (!isCurrent) return;
      setAccount(found);
      setStatus(found === null ? "signed-out" : "signed-in");
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  const signIn = React.useCallback(
    async (email: string, passphrase: string): Promise<OperatorAccount> => {
      const signedIn = await services.session.signIn(email, passphrase);
      setAccount(signedIn);
      setStatus("signed-in");
      return signedIn;
    },
    [],
  );

  const signOut = React.useCallback(async (): Promise<void> => {
    await services.session.signOut();
    setAccount(null);
    setStatus("signed-out");
  }, []);

  const value = React.useMemo<OperatorSessionValue>(
    () => ({ status, account, signIn, signOut }),
    [status, account, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useOperatorSession(): OperatorSessionValue {
  const value = React.useContext(SessionContext);
  if (value === null) {
    throw new Error(
      "useOperatorSession was called outside OperatorSessionProvider. It belongs in app/layout.tsx, above everything.",
    );
  }
  return value;
}
