/**
 * Sign-in against the real thing: Supabase for the credentials, GET /me for the
 * profile, GET /me/restaurants for what this account may act for.
 *
 * The one translation this file exists for: the API spells the senior role
 * `admin`, and every label in this console says Manager. The two words meet
 * here and nowhere else.
 *
 * The other gap is deliberate and documented rather than papered over: the
 * API's membership row carries a role and no per-person permissions, so
 * `granted` comes back empty. That makes a staff member on the live API exactly
 * as capable as their role and never accidentally more — which is the safe
 * direction for a permission model the server does not know about yet.
 */
import {
  api,
  AuthError,
  fetchMyProfile,
  fetchMyRestaurants,
  getAuthUser,
  isAuthError,
  linkProfile,
  requiresProfileLink,
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
  signUp as supabaseSignUp,
  type MyRestaurant,
  type UserProfile,
} from "@repo/api-client";
import type { Membership, Profile, StaffRole } from "../../types";
import type { AuthState, IdentityService, ProfileDetails } from "../types";
import { notImplemented } from "./unsupported";

/** `admin` on the wire, Manager on screen. */
export function fromApiRole(role: "staff" | "admin"): StaffRole {
  return role === "admin" ? "manager" : "staff";
}

export function toApiRole(role: StaffRole): "staff" | "admin" {
  return role === "manager" ? "admin" : "staff";
}

function toProfile(profile: UserProfile): Profile {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    city: profile.city,
    avatar_url: profile.avatar_url ?? null,
  };
}

function toMembership(row: MyRestaurant): Membership {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    image_url: row.image_url,
    is_active: row.is_active,
    role: fromApiRole(row.role),
    granted: [],
  };
}

/**
 * Supabase's rate limit, in words the person filling in the form can act on.
 *
 * The one refusal on this screen that must NOT go through verbatim. Everything
 * else Supabase says about a sign-up is about the sign-up — the address is
 * taken, the password is too short — and the applicant can fix it. "email rate
 * limit exceeded" is about the PROJECT: confirmation emails are switched on, the
 * built-in mailer allows a couple an hour, and somebody else used them. Nothing
 * about the form is wrong and no amount of editing it helps, so the sentence has
 * to say whose problem it is and what ends it.
 *
 * Recognised on the status rather than the wording — 429 is the contract, the
 * string is Supabase's to change — with the message as a fallback, because
 * GoTrue has answered this as a 400 in the past.
 */
const RATE_LIMITED = 429;

async function signUpOrExplain(email: string, password: string) {
  try {
    return await supabaseSignUp(email, password);
  } catch (cause) {
    const isRateLimit =
      isAuthError(cause) &&
      (cause.status === RATE_LIMITED || /rate limit/i.test(cause.message));
    if (!isRateLimit) throw cause;
    throw new AuthError(
      "Foodishi could not send the confirmation email — this project's mailer " +
        "allows only a few per hour and they have been used. Your account was " +
        "NOT created, so nothing is half-done: try again in an hour, or ask " +
        "Foodishi to switch email confirmation off for this environment.",
      RATE_LIMITED,
    );
  }
}

async function readAuthState(): Promise<AuthState> {
  // Both reads in parallel: they are independent, and the shell blocks on the
  // slower one either way.
  const [profile, restaurants] = await Promise.all([
    fetchMyProfile(),
    fetchMyRestaurants(),
  ]);
  return {
    profile: toProfile(profile),
    memberships: restaurants.map(toMembership),
  };
}

export const apiIdentity: IdentityService = {
  async getAuthState() {
    const user = await getAuthUser();
    // Signed out is an answer, not a failure. Asking the API first would turn
    // an ordinary cold start into a 401 in the console on every load.
    if (user === null) return null;
    try {
      return await readAuthState();
    } catch (error) {
      // A signed-in identity with no public.users row. NOT a failed read: the
      // token is good and the only thing missing is a form nobody has been
      // offered yet, which is what /apply exists to offer. @repo/api-client
      // already tells these apart — GET /me's 404 names /auth/link, and the
      // fetcher turns that into action "link-profile".
      //
      // Thrown before this branch existed, which every screen renders as "could
      // not check who is signed in" — a dead end for the exact account a
      // confirm-email project produces at sign-up.
      if (requiresProfileLink(error)) return "unlinked";
      throw error;
    }
  },

  async signIn(email, password) {
    await supabaseSignIn(email, password);
    return readAuthState();
  },

  async signUp({ email, password, name, phone, city }) {
    // Two calls, both real, and the order is not interchangeable. supabase-js
    // mints the identity and the session; POST /auth/link then joins it to a
    // public.users row. Until that second call lands GET /me answers 404 and
    // names /auth/link, so there is no way to skip it and no state in between
    // worth showing anybody.
    const { needsEmailConfirmation } = await signUpOrExplain(email, password);
    if (needsEmailConfirmation) {
      // No session, so /auth/link would 401. The project is set to confirm
      // addresses first; the screen sends them to their inbox.
      return null;
    }

    // The address is deliberately NOT passed. /auth/link takes it from the
    // verified token and nowhere else — a body that could name an address could
    // claim somebody else's profile by typing theirs.
    await linkProfile({ name, phone, city });

    // Read back rather than assembled from what was just typed: linking may
    // have CLAIMED an existing profile rather than created one (a seeded
    // restaurateur signing up with the address already on their row), and that
    // profile is the truth about who this is.
    return readAuthState();
  },

  async completeProfile({ name, phone, city }: ProfileDetails) {
    // The address is deliberately absent, as it is in signUp: /auth/link takes
    // it from the verified token, which is what stops a body naming somebody
    // else's address from claiming their profile.
    await linkProfile({ name, phone, city });
    return readAuthState();
  },

  signOut() {
    return supabaseSignOut();
  },

  async updateMyProfile(patch) {
    // PATCH /me takes name, email, phone and city — and NOT avatar_url, which
    // the column has but the schema does not accept. Sending it would be a 422
    // on `extra="forbid"`, so it is dropped here and the profile screen says so
    // rather than appearing to save a photo it cannot.
    const written = await api.patch<UserProfile>("/me", {
      ...(patch.name === undefined ? {} : { name: patch.name }),
      ...(patch.phone === undefined ? {} : { phone: patch.phone }),
      ...(patch.city === undefined ? {} : { city: patch.city }),
    });
    return toProfile(written);
  },

  changeMyPassword() {
    // Supabase can do this — `updateUser({ password })` — but it does not check
    // the current password, and this console's contract says it must. Wiring it
    // up as if it did would be the wrong kind of working.
    return notImplemented(
      "POST /me/password",
      "Changing your password from this console",
    );
  },
};
