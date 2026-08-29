/**
 * The operator's own identity, against real Supabase auth and a real profile.
 *
 * THIS IS THE ONE SERVICE THAT IS NOT JUST HTTP. The other nine call the FastAPI
 * backend and nothing else; sign-in is two systems. Supabase says who somebody
 * is and issues the ES256 access token, and `GET /me` says what this platform
 * has recorded about them — including `platform_role`, which is what
 * `require_platform_role` checks on every `/admin/*` route. Neither answer is
 * sufficient alone: a valid token with no `platform_staff` row is a customer who
 * happens to be signed in, and this console must not let them past.
 *
 * WHAT THIS REPLACES. `fixtures/session.ts` opens with "THIS IS NOT
 * AUTHENTICATION" and matches an email against bundled JSON plus one shared
 * passphrase — it "gates nothing an attacker could not reach by opening the
 * bundle". Everything in this file is the real thing: a password Supabase
 * verifies, a signed token the API checks, and a grant the API enforces.
 */
import {
  fetchMyProfile,
  isApiError,
  isAuthError,
  type MyProfile,
  signIn as signInWithSupabase,
  signOut as signOutOfSupabase,
} from "@repo/api-client";

import type { OperatorAccount, SessionService } from "../types";

/** The rung this console requires. Anything else is not an operator. */
const REQUIRED_ROLE = "admin";

const NOT_AN_OPERATOR =
  "That account exists but has no Foodishi operator access. Ask an admin to grant it.";

/**
 * Turn a profile into an OperatorAccount, or refuse it.
 *
 * Returning null rather than throwing for a missing grant is deliberate on the
 * `current()` path: a customer who is signed in elsewhere in the same browser
 * has a perfectly valid token, and the console's job is to show them the
 * sign-in screen, not an error. `signIn()` throws instead, because there the
 * person actively asked to come in and is owed a reason.
 */
function toOperator(profile: MyProfile): OperatorAccount | null {
  if (profile.platform_role !== REQUIRED_ROLE) return null;
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    // The API allows these to be null; OperatorAccount does not. An empty
    // string is the honest rendering of "not recorded" for a display field.
    phone: profile.phone ?? "",
    city: profile.city ?? "",
    platform_role: REQUIRED_ROLE,
    // Optional on the generated schema, so it can be undefined as well as
    // null. OperatorAccount admits only null, and "no photo" is one state.
    avatar_url: profile.avatar_url ?? null,
    created_at: profile.created_at,
  };
}

export const apiSession: SessionService = {
  async current() {
    try {
      const profile = await fetchMyProfile();
      return toOperator(profile);
    } catch (error) {
      // 401 (no token, or expired) and 404 (a Supabase identity with no
      // public.users row linked to it) are both "not signed in as an operator"
      // from this console's point of view. Anything else — the API being down,
      // a 500 — must NOT be swallowed into a silent sign-out, or an outage
      // looks exactly like a logout and nobody investigates.
      if (isApiError(error) && (error.status === 401 || error.status === 404)) {
        return null;
      }
      if (isAuthError(error)) return null;
      throw error;
    }
  },

  async signIn(email, passphrase) {
    // Supabase first: no point asking the API who somebody is before they have
    // a token for it to verify.
    await signInWithSupabase(email, passphrase);

    const profile = await fetchMyProfile();
    const operator = toOperator(profile);
    if (operator === null) {
      // Signed in, but not an operator. Sign them back out rather than leaving
      // a usable token in the browser for a console they cannot use — a
      // half-signed-in state is the one thing worse than a refusal.
      await signOutOfSupabase();
      throw new Error(NOT_AN_OPERATOR);
    }
    return operator;
  },

  async signOut() {
    await signOutOfSupabase();
  },

  listAccounts() {
    // EMPTY, on purpose, and not an oversight.
    //
    // The fixture returns the seeded operator addresses so the sign-in screen
    // can offer a tap-to-fill hint. There is no route that lists platform staff
    // and there should not be: "which addresses can administer this platform"
    // is the single most useful thing an attacker could ask an unauthenticated
    // endpoint, and the interface's own comment scopes this to "the sign-in
    // screen's development hint".
    //
    // The screen already handles an empty list by simply not rendering the hint.
    return Promise.resolve([]);
  },
};
