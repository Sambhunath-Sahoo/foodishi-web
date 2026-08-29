"use client";

import { useSession } from "@repo/api-client";
import type { ApiError, ProfileStatus, SessionStatus } from "@repo/api-client";
import { isFixtureSource } from "./services";
import { useFixtureIdentity } from "./services/fixtures/identity";

/**
 * Who is ordering — for real this time.
 *
 * Identity is a signed Supabase session; `userId` is the `public.users` row
 * that GET /me joins to it. The two are separate on purpose: a brand-new
 * signup has a session but no profile until POST /auth/link runs, and every
 * customer endpoint that takes a `user_id` needs the profile id, not the
 * Supabase uuid.
 *
 * This replaces the phase-1 `X-Dev-User-Id` header, which the API no longer
 * accepts and the fetcher now strips.
 */
export interface AccountState {
  /** The `public.users` id, or null when signed out or not yet linked. */
  readonly userId: number | null;
  /** The address the session was opened with, for the header and the gate. */
  readonly email: string | null;
  readonly displayName: string | null;
  /** The rest of the editable profile, for the account screen's form. */
  readonly phone: string | null;
  readonly city: string | null;
  /**
   * The customer's photo, or null. Null is the ordinary answer, not a failure:
   * <Thumb> draws initials for it, so every avatar surface renders either way.
   */
  readonly avatarUrl: string | null;
  readonly isSignedIn: boolean;
  /** False while supabase-js rehydrates or GET /me is still in flight. */
  readonly isReady: boolean;
  /** Signed in, but no `public.users` profile is joined to this identity yet. */
  readonly needsProfileLink: boolean;
  readonly status: SessionStatus;
  readonly profileStatus: ProfileStatus;
  /** The server's own /me failure, shown verbatim. */
  readonly profileError: ApiError | null;
  readonly signOut: () => Promise<void>;
}

export function useAccount(): AccountState {
  // Both hooks always run — a conditional hook is not allowed, and the branch
  // is a build-time constant so the unused one costs a render and nothing more.
  const fixture = useFixtureIdentity();
  const real = useSession();

  if (isFixtureSource) return fromFixtureIdentity(fixture);
  return fromSession(real);
}

/**
 * The fixture stand-in, shaped exactly like the real thing so no screen can
 * tell the difference. There is no profile-link step: a fixture customer
 * either exists in DEMO_CUSTOMERS or is not signed in.
 */
function fromFixtureIdentity(
  fixture: ReturnType<typeof useFixtureIdentity>,
): AccountState {
  const { profile, isReady, signOut } = fixture;
  const isSignedIn = profile !== null;
  return {
    userId: profile?.id ?? null,
    email: profile?.email ?? null,
    displayName: profile?.name ?? null,
    phone: profile?.phone ?? null,
    city: profile?.city ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    isSignedIn,
    isReady,
    needsProfileLink: false,
    status: isReady
      ? isSignedIn
        ? "authenticated"
        : "unauthenticated"
      : "loading",
    profileStatus: isSignedIn ? "ready" : "unlinked",
    profileError: null,
    signOut,
  };
}

function fromSession(session: ReturnType<typeof useSession>): AccountState {
  const { user, profile, status, profileStatus, profileError, signOut } = session;

  const isSignedIn = status === "authenticated";
  const isProfileSettled =
    profileStatus === "ready" ||
    profileStatus === "unlinked" ||
    profileStatus === "error";

  return {
    userId: profile?.id ?? null,
    email: profile?.email ?? user?.email ?? null,
    displayName: profile?.name ?? null,
    phone: profile?.phone ?? null,
    city: profile?.city ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    isSignedIn,
    isReady: status === "unauthenticated" || (isSignedIn && isProfileSettled),
    needsProfileLink: profileStatus === "unlinked",
    status,
    profileStatus,
    profileError,
    signOut,
  };
}
