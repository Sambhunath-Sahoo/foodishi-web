import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The browser Supabase client. Built from the two NEXT_PUBLIC vars and nothing
 * else — the secret key bypasses RLS and must never reach a bundle.
 *
 * Created once, lazily. Lazily because a module-level `createClient` would run
 * during `next build` on machines where the env is not yet wired and take the
 * whole build down; once because two clients race each other over the same
 * localStorage session and refresh each other's tokens out from under the app.
 */
const SUPABASE_URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY_VAR = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

/** The auth storage key. One per project ref, which supabase-js derives itself. */
export interface SupabaseConfig {
  readonly url: string;
  readonly anonKey: string;
}

function missing(variable: string): Error {
  return new Error(
    `${variable} is not set. Copy it from the Foodishi API .env into this app's ` +
      `.env.local (${SUPABASE_URL_VAR} = SUPABASE_URL, ` +
      `${SUPABASE_ANON_KEY_VAR} = SUPABASE_PUBLISHABLE_KEY) and restart the dev ` +
      `server. Never use SUPABASE_SECRET_KEY in a frontend app — it bypasses RLS.`,
  );
}

/**
 * Reads and validates the public Supabase config. Throws naming the variable
 * that is missing, so a misconfigured app fails at sign-in with a sentence an
 * engineer can act on rather than an opaque 401 three screens later.
 */
export function getSupabaseConfig(): SupabaseConfig {
  // Read as whole expressions, not `process.env[name]` — Next inlines
  // NEXT_PUBLIC_* only when it can see the literal property access.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url === undefined || url.trim() === "") throw missing(SUPABASE_URL_VAR);
  if (anonKey === undefined || anonKey.trim() === "") {
    throw missing(SUPABASE_ANON_KEY_VAR);
  }

  return { url: url.trim().replace(/\/+$/, ""), anonKey: anonKey.trim() };
}

/** True when both public vars are present — for a config check that must not throw. */
export function isSupabaseConfigured(): boolean {
  try {
    getSupabaseConfig();
    return true;
  } catch {
    return false;
  }
}

let cachedClient: SupabaseClient | null = null;

/** The one Supabase client for this browser session. */
export function getSupabaseClient(): SupabaseClient {
  if (cachedClient !== null) return cachedClient;

  const { url, anonKey } = getSupabaseConfig();
  cachedClient = createClient(url, anonKey, {
    auth: {
      // The session lives in localStorage and refreshes itself; the access
      // token is an hour-lived ES256 JWT, so nothing may cache it.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
  return cachedClient;
}

export type { SupabaseClient };
