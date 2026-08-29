"use client";

import { signUp as supabaseSignUp, useSession, type SessionStatus } from "@repo/api-client";
import { isFixtureSource } from "./services";
import { useFixtureIdentity } from "./services/fixtures/identity";

/**
 * Signing in, whichever source is behind the app.
 *
 * Against `api` this is supabase-js `signInWithPassword`. Against `fixtures`
 * it matches an email in DEMO_CUSTOMERS and checks the shared demo password —
 * enough to give the form a real success and a real failure to render, and
 * nothing more. The auth screens read this instead of `useSession` directly so
 * neither of them has to know which is running.
 */
export interface SignUpResult {
  /** False against fixtures: there is no mailbox to send a link to. */
  readonly needsEmailConfirmation: boolean;
}

export interface SignInApi {
  readonly signIn: (email: string, password: string) => Promise<void>;
  readonly signUp: (email: string, password: string) => Promise<SignUpResult>;
  readonly status: SessionStatus;
}

export function useSignIn(): SignInApi {
  // Both run every render: a conditional hook is not allowed, and the branch
  // below is a build-time constant.
  const fixture = useFixtureIdentity();
  const session = useSession();

  if (!isFixtureSource) {
    return {
      signIn: session.signIn,
      signUp: supabaseSignUp,
      status: session.status,
    };
  }

  return {
    signIn: fixture.signIn,
    signUp: async (email, password) => {
      await fixture.signUp(email, password);
      return { needsEmailConfirmation: false };
    },
    status: !fixture.isReady
      ? "loading"
      : fixture.profile === null
        ? "unauthenticated"
        : "authenticated",
  };
}
