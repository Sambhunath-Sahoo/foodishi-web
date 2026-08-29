import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "./client";

/**
 * Sign-in, sign-out, and the access token every API call carries.
 *
 * This module deliberately holds no token of its own. `getSession()` is the
 * only source: supabase-js refreshes the hour-lived ES256 access token behind
 * it, and a cached copy goes stale — the app would work for an hour and then
 * 401 on everything with no visible cause.
 */
export type { AuthChangeEvent, Session, User };

export class AuthError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/** Sign in with email and password. Throws AuthError carrying Supabase's own wording. */
export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error !== null) throw new AuthError(error.message, error.status);
  if (data.session === null) {
    throw new AuthError("Supabase returned no session for those credentials.");
  }
  return data.session;
}

export interface SignUpResult {
  readonly session: Session | null;
  readonly user: User | null;
  /** True when the project requires the address to be confirmed before sign-in. */
  readonly needsEmailConfirmation: boolean;
}

/**
 * Create a brand-new account. A signup has no profile yet, so the caller must
 * follow a successful signup with `linkProfile` — until then `GET /me` 404s
 * with a message naming /auth/link.
 */
export async function signUp(email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: email.trim(),
    password,
  });

  if (error !== null) throw new AuthError(error.message, error.status);
  return {
    session: data.session,
    user: data.user,
    needsEmailConfirmation: data.session === null && data.user !== null,
  };
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error !== null) throw new AuthError(error.message, error.status);
}

/** The current session, refreshed if the access token has expired. Null when signed out. */
export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error !== null) return null;
  return data.session;
}

/**
 * The bearer token for the next API call, or null when signed out.
 *
 * Always awaited, never cached: `getSession()` transparently refreshes an
 * expired token, which is the whole reason this is async.
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

/** The signed-in Supabase auth user (identity, not the public.users profile). */
export async function getAuthUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export type AuthChangeHandler = (
  session: Session | null,
  event: AuthChangeEvent,
) => void;

/**
 * Subscribe to sign-in, sign-out and token refresh. Returns the unsubscribe
 * function; call it on unmount or the callback outlives the component.
 */
export function onAuthChange(handler: AuthChangeHandler): () => void {
  if (!isSupabaseConfigured()) return () => undefined;

  const { data } = getSupabaseClient().auth.onAuthStateChange((event, session) => {
    handler(session, event);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
