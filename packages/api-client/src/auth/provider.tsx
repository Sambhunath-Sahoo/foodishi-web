"use client";

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { ApiError, isApiError } from "../error";
import {
  getSession,
  onAuthChange,
  signIn as signInWithSupabase,
  signOut as signOutOfSupabase,
} from "./session";
import { fetchMyProfile, type MyProfile } from "./profile";
import type { PlatformRole } from "./platform-role";

/**
 * `loading` is a real state, not a shade of signed-out. Without it every app
 * paints its login screen for one frame on every refresh while supabase-js
 * rehydrates the session from localStorage.
 */
export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

/** Where the GET /me lookup stands, separately from the session itself. */
export type ProfileStatus =
  | "idle"
  | "loading"
  | "ready"
  /** Signed in, but this identity has never been linked. POST /auth/link. */
  | "unlinked"
  | "error";

export interface SessionContextValue {
  readonly session: Session | null;
  readonly user: User | null;
  /** The GET /me profile. Null while loading, when signed out, or when unlinked. */
  readonly profile: MyProfile | null;
  /**
   * The caller's rank as Foodishi platform staff, or null for everyone else.
   *
   * Null is an ordinary answer, not an error: a customer and a restaurant
   * staffer both have one. It also reads null until /me lands, so gate on
   * `profileStatus` before treating it as a refusal.
   */
  readonly platformRole: PlatformRole | null;
  readonly status: SessionStatus;
  readonly profileStatus: ProfileStatus;
  /** The server's own detail for a failed /me — shown verbatim. */
  readonly profileError: ApiError | null;
  readonly signIn: (email: string, password: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
  /** Re-read GET /me, e.g. straight after linking a new signup. */
  readonly refreshProfile: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

export interface SessionProviderProps {
  readonly children: React.ReactNode;
}

function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  const detail =
    error instanceof Error && error.message !== ""
      ? error.message
      : "Could not load your profile.";
  return new ApiError({ status: 0, url: "/me", detail, body: error });
}

/**
 * Holds the Supabase session and the profile behind it. One per app, above
 * everything that reads `useSession`.
 */
export function SessionProvider({ children }: SessionProviderProps): React.JSX.Element {
  const [session, setSession] = React.useState<Session | null>(null);
  const [status, setStatus] = React.useState<SessionStatus>("loading");
  const [profile, setProfile] = React.useState<MyProfile | null>(null);
  const [profileStatus, setProfileStatus] = React.useState<ProfileStatus>("idle");
  const [profileError, setProfileError] = React.useState<ApiError | null>(null);

  // The access token, not the session object: supabase-js hands back a new
  // object on every refresh, which would re-run the /me effect hourly.
  const accessToken = session?.access_token ?? null;

  // One subscription for the whole app. The initial getSession() resolves the
  // "loading" state; onAuthChange keeps it true afterwards.
  React.useEffect(() => {
    let isMounted = true;

    void getSession().then((initial) => {
      if (!isMounted) return;
      setSession(initial);
      setStatus(initial === null ? "unauthenticated" : "authenticated");
    });

    const unsubscribe = onAuthChange((next) => {
      if (!isMounted) return;
      setSession(next);
      setStatus(next === null ? "unauthenticated" : "authenticated");
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const loadProfile = React.useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      setProfileStatus("loading");
      setProfileError(null);
      try {
        const me = await fetchMyProfile(signal);
        if (signal?.aborted === true) return;
        setProfile(me);
        setProfileStatus("ready");
      } catch (error) {
        if (signal?.aborted === true) return;
        const apiError = toApiError(error);
        setProfile(null);
        setProfileError(apiError);
        // 404 here is the linking gap, and the server's detail names
        // /auth/link. It is a state to act on, not a failure to hide.
        setProfileStatus(apiError.requiresProfileLink ? "unlinked" : "error");
      }
    },
    [],
  );

  React.useEffect(() => {
    if (accessToken === null) {
      setProfile(null);
      setProfileStatus("idle");
      setProfileError(null);
      return;
    }

    const controller = new AbortController();
    void loadProfile(controller.signal);
    return () => {
      controller.abort();
    };
  }, [accessToken, loadProfile]);

  const handleSignIn = React.useCallback(
    async (email: string, password: string): Promise<void> => {
      const next = await signInWithSupabase(email, password);
      // Set it here as well as in the listener so the caller can navigate the
      // moment its promise resolves, rather than on the next event tick.
      setSession(next);
      setStatus("authenticated");
    },
    [],
  );

  const handleSignOut = React.useCallback(async (): Promise<void> => {
    await signOutOfSupabase();
    setSession(null);
    setStatus("unauthenticated");
    setProfile(null);
    setProfileStatus("idle");
    setProfileError(null);
  }, []);

  const refreshProfile = React.useCallback(async (): Promise<void> => {
    if (accessToken === null) return;
    await loadProfile();
  }, [accessToken, loadProfile]);

  const value = React.useMemo<SessionContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      // Derived, not stored: a second copy would be one more thing to clear on
      // sign-out, and the one that got missed is the one that grants access.
      platformRole: profile?.platform_role ?? null,
      status,
      profileStatus,
      profileError,
      signIn: handleSignIn,
      signOut: handleSignOut,
      refreshProfile,
    }),
    [
      session,
      profile,
      status,
      profileStatus,
      profileError,
      handleSignIn,
      handleSignOut,
      refreshProfile,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** The session, the profile, and the two verbs. Throws outside SessionProvider. */
export function useSession(): SessionContextValue {
  const value = React.useContext(SessionContext);
  if (value === null) {
    throw new Error(
      "useSession must be used inside <SessionProvider>. Wrap this app's root layout in it.",
    );
  }
  return value;
}
