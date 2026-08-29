"use client";

/**
 * Who is signed in on this tablet, read through the service layer.
 *
 * Deliberately NOT @repo/api-client's `SessionProvider`. That one is Supabase
 * plus GET /me, which is exactly right when the console is pointed at the API
 * and impossible when it is pointed at bundled JSON. Going through
 * `services.identity` means one provider serves both, and the swap in
 * `lib/services/index.ts` stays the only place the source is named.
 *
 * The session is a TanStack query like everything else, so a sign-in
 * invalidates it and every screen re-reads rather than each one keeping its own
 * copy of who is here.
 */
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "./services";
import { MEMBERSHIP_STALE_MS, queryKeys } from "./query-keys";
import type { Membership, Profile } from "./types";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface SessionValue {
  readonly status: SessionStatus;
  readonly profile: Profile | null;
  readonly memberships: readonly Membership[];
  /** A read that failed, as opposed to a read that said "nobody is here". */
  readonly error: unknown;
  readonly isSigningIn: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Re-read the session — after editing your own profile, say. */
  refresh(): void;
}

const SessionContext = React.createContext<SessionValue | null>(null);

export function SessionProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: queryKeys.auth(),
    staleTime: MEMBERSHIP_STALE_MS,
    // Signed out is an answer, not a failure, so this must not retry its way
    // through a cold start.
    retry: false,
    queryFn: () => services.identity.getAuthState(),
  });

  const signInMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      services.identity.signIn(email, password),
    onSuccess: (state) => {
      // Seeded rather than invalidated: the sign-in call already answered with
      // the state, and a second read would leave the tablet on the sign-in
      // screen for another round trip.
      queryClient.setQueryData(queryKeys.auth(), state);
    },
  });

  // Depends on `mutateAsync`, which is stable, rather than on the mutation
  // object — that is a new reference every render and would churn the whole
  // context value with it.
  const { mutateAsync: runSignIn } = signInMutation;
  const signIn = React.useCallback(
    async (email: string, password: string): Promise<void> => {
      await runSignIn({ email, password });
    },
    [runSignIn],
  );

  const signOut = React.useCallback(async (): Promise<void> => {
    await services.identity.signOut();
    // Everything, not just the session: the next person at this tablet must not
    // see the last one's queue for even one frame.
    queryClient.clear();
    queryClient.setQueryData(queryKeys.auth(), null);
  }, [queryClient]);

  const refresh = React.useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth() });
  }, [queryClient]);

  const value = React.useMemo<SessionValue>(() => {
    const status: SessionStatus = session.isPending
      ? "loading"
      : session.data == null
        ? "unauthenticated"
        : "authenticated";

    return {
      status,
      profile: session.data?.profile ?? null,
      memberships: session.data?.memberships ?? [],
      error: session.error,
      isSigningIn: signInMutation.isPending,
      signIn,
      signOut,
      refresh,
    };
  }, [
    session.isPending,
    session.data,
    session.error,
    signInMutation.isPending,
    signIn,
    signOut,
    refresh,
  ]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = React.useContext(SessionContext);
  if (value === null) {
    throw new Error("useSession must be used inside <SessionProvider>.");
  }
  return value;
}
