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
  fetchMyProfile,
  fetchMyRestaurants,
  getAuthUser,
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
  type MyRestaurant,
  type UserProfile,
} from "@repo/api-client";
import type { Membership, Profile, StaffRole } from "../../types";
import type { AuthState, IdentityService } from "../types";
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
    return readAuthState();
  },

  async signIn(email, password) {
    await supabaseSignIn(email, password);
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
