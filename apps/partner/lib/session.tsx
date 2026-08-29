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
import type { ProfileDetails, SignUpDetails } from "./services/types";
import type { Membership, Profile } from "./types";

/**
 * FOUR states, and `"unlinked"` is the one worth explaining.
 *
 * Supabase Auth and `public.users` are separate records joined by POST
 * /auth/link, so a signed-in identity can have no Foodishi profile — which is
 * the ordinary outcome of signing up on a project that confirms email
 * addresses, because there is no session at sign-up for the link call to use.
 *
 * It is a status rather than an error because it is not a failure: nothing is
 * broken, one form is unanswered. /apply offers that form; every other screen
 * sends them there.
 */
export type SessionStatus =
  | "loading"
  | "authenticated"
  | "unlinked"
  | "unauthenticated";

export interface SessionValue {
  readonly status: SessionStatus;
  readonly profile: Profile | null;
  readonly memberships: readonly Membership[];
  /** A read that failed, as opposed to a read that said "nobody is here". */
  readonly error: unknown;
  readonly isSigningIn: boolean;
  signIn(email: string, password: string): Promise<void>;
  /**
   * Create an account and sign in with it.
   *
   * Answers false when the source made the account but cannot hand back a
   * session — a Supabase project that confirms addresses first. The caller sends
   * them to their inbox rather than into a console that would 401 on every read.
   */
  signUp(details: SignUpDetails): Promise<boolean>;
  /** Finish an `"unlinked"` account by giving it the profile it is missing. */
  completeProfile(details: ProfileDetails): Promise<void>;
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

  const signUpMutation = useMutation({
    mutationFn: (details: SignUpDetails) => services.identity.signUp(details),
    onSuccess: (state) => {
      // Seeded exactly as sign-in is. A null state is a real answer — the
      // account exists and has no session yet — and writing it means the shell
      // reads "signed out" rather than sitting on a spinner forever.
      queryClient.setQueryData(queryKeys.auth(), state);
    },
  });

  // Depends on `mutateAsync`, which is stable, rather than on the mutation
  // object — that is a new reference every render and would churn the whole
  // context value with it.
  const { mutateAsync: runSignIn } = signInMutation;
  const { mutateAsync: runSignUp } = signUpMutation;
  const signIn = React.useCallback(
    async (email: string, password: string): Promise<void> => {
      await runSignIn({ email, password });
    },
    [runSignIn],
  );

  const signUp = React.useCallback(
    async (details: SignUpDetails): Promise<boolean> => {
      const state = await runSignUp(details);
      return state !== null;
    },
    [runSignUp],
  );

  const completeProfileMutation = useMutation({
    mutationFn: (details: ProfileDetails) =>
      services.identity.completeProfile(details),
    onSuccess: (state) => {
      queryClient.setQueryData(queryKeys.auth(), state);
    },
  });

  const { mutateAsync: runCompleteProfile } = completeProfileMutation;
  const completeProfile = React.useCallback(
    async (details: ProfileDetails): Promise<void> => {
      await runCompleteProfile(details);
    },
    [runCompleteProfile],
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
    const state = session.data;
    const status: SessionStatus = session.isPending
      ? "loading"
      : state == null
        ? "unauthenticated"
        : state === "unlinked"
          ? "unlinked"
          : "authenticated";

    // Narrowed on `typeof`, not on the literal: `AuthResult` carries a string
    // sentinel beside an object, and `.profile` on the string is undefined at
    // runtime rather than a compile error, which is exactly the mistake worth
    // making impossible here.
    const linked = typeof state === "object" && state !== null ? state : null;

    return {
      status,
      profile: linked?.profile ?? null,
      memberships: linked?.memberships ?? [],
      error: session.error,
      // One flag for both: a screen that offers sign-in and sign-up disables
      // the same form either way, and two booleans would be two chances to
      // check the wrong one.
      isSigningIn:
        signInMutation.isPending ||
        signUpMutation.isPending ||
        completeProfileMutation.isPending,
      signIn,
      signUp,
      completeProfile,
      signOut,
      refresh,
    };
  }, [
    session.isPending,
    session.data,
    session.error,
    signInMutation.isPending,
    signUpMutation.isPending,
    completeProfileMutation.isPending,
    signIn,
    signUp,
    completeProfile,
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
