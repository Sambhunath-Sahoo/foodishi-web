/**
 * Sign-in, without an auth server.
 *
 * This is a **drawing of authentication, not authentication.** The seed carries
 * plain-text passwords, the check is a string comparison in the browser, and
 * anybody who opens devtools can sign in as anyone. That is acceptable for
 * exactly one reason: it is the only way to review the Manager and Staff
 * versions of this console — which are genuinely different products — without
 * the backend up.
 *
 * When `NEXT_PUBLIC_DATA_SOURCE=api` this file is never reached. Sign-in is
 * Supabase, the token is the authority, and every gate this app draws becomes
 * cosmetic on top of a server that refuses for real.
 */
import { resolvePermissions } from "../../permissions";
import type { Membership, Permission, Profile } from "../../types";
import type { AuthState, IdentityService, PasswordChange, ProfilePatch } from "../types";
import { ConflictError, UnauthorizedError, UnprocessableError, settle } from "./latency";
import {
  allStaff,
  createAccount,
  findAccount,
  findAccountByEmail,
  findRestaurant,
  readSessionUserId,
  writePassword,
  writeProfilePatch,
  writeSessionUserId,
} from "./store";

/** The API's own floor, so a fixture password cannot be weaker than a real one. */
const PASSWORD_MIN = 8;

function toProfile(account: {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly city: string;
  readonly avatar_url?: string | null;
}): Profile {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    city: account.city,
    avatar_url: account.avatar_url ?? null,
  };
}

/**
 * The restaurants this account may act for.
 *
 * Built from the roster the same way the API builds GET /me/restaurants: from
 * the person's own membership rows. A revoked membership is not a restaurant
 * they may open, so it is left out entirely rather than listed as closed — the
 * console must never offer a kitchen that every screen would then refuse.
 */
function membershipsFor(userId: number): readonly Membership[] {
  return allStaff()
    .filter((row) => row.user_id === userId && row.is_active)
    .map((row) => {
      const restaurant = findRestaurant(row.restaurant_id);
      if (restaurant === null) return null;
      return {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        city: restaurant.city,
        image_url: restaurant.image_url ?? null,
        is_active: restaurant.is_active,
        role: row.role,
        granted: row.granted,
      };
    })
    .filter((row): row is Membership => row !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function authStateFor(userId: number): AuthState | null {
  const account = findAccount(userId);
  if (account === null) return null;
  return { profile: toProfile(account), memberships: membershipsFor(userId) };
}

function requireSignedIn(): number {
  const userId = readSessionUserId();
  if (userId === null) {
    throw new UnauthorizedError("Sign in again — this session has ended.");
  }
  return userId;
}

export const fixtureIdentity: IdentityService = {
  getAuthState() {
    const userId = readSessionUserId();
    // Signed out is an answer, not a failure: the shell has to be able to ask.
    return settle(userId === null ? null : authStateFor(userId), 60);
  },

  async signIn(email, password) {
    const account = findAccountByEmail(email);
    // One message for both halves. "No such account" tells whoever is holding
    // the tablet which addresses exist, and that is not theirs to learn.
    if (account === null || account.password !== password) {
      throw new UnauthorizedError("That email and password do not match an account.");
    }
    writeSessionUserId(account.id);
    const state = authStateFor(account.id);
    if (state === null) {
      throw new UnauthorizedError("That account could not be opened.");
    }
    return settle(state);
  },

  async signUp({ email, password, name, phone, city }) {
    // The API's own floor, applied here too: a fixture account created with a
    // weaker password than Supabase would accept teaches whoever reviews this
    // screen the wrong rule.
    if (password.length < PASSWORD_MIN) {
      throw new UnprocessableError(
        `A password needs at least ${PASSWORD_MIN} characters.`,
      );
    }

    const account = createAccount({ name, email, phone, city, password });
    if (account === null) {
      // What public.users' unique index on email produces, in the words
      // /auth/link uses for it.
      throw new ConflictError(
        "That email address already belongs to an account. Sign in instead.",
      );
    }

    // Signed in immediately: there is no address to confirm without an auth
    // server, so the "check your inbox" branch the API source can return is not
    // reachable here. A brand-new account works at no restaurant, so this state
    // carries no memberships — which is the answer, not an empty one.
    writeSessionUserId(account.id);
    return settle(authStateFor(account.id));
  },

  completeProfile() {
    // Unreachable by construction: this source has no auth server, so every
    // account it knows about was created here WITH its profile — `getAuthState`
    // can never answer "unlinked". Refused loudly rather than quietly
    // succeeding, because a fixture that pretended to link a profile would be
    // drawing a state this source cannot be in.
    return Promise.reject(
      new UnprocessableError(
        "There is no unlinked account on the sample data — every account here already has a profile.",
      ),
    );
  },

  async signOut() {
    writeSessionUserId(null);
    await settle(null, 60);
  },

  async updateMyProfile(patch: ProfilePatch) {
    const userId = requireSignedIn();
    const name = patch.name?.trim();
    if (name !== undefined && name.length < 2) {
      throw new UnprocessableError("A name needs at least two characters.");
    }
    writeProfilePatch(userId, {
      ...patch,
      ...(name === undefined ? {} : { name }),
    });
    const account = findAccount(userId);
    if (account === null) throw new UnauthorizedError("This account no longer exists.");
    return settle(toProfile(account));
  },

  async changeMyPassword({ currentPassword, newPassword }: PasswordChange) {
    const userId = requireSignedIn();
    const account = findAccount(userId);
    if (account === null) throw new UnauthorizedError("This account no longer exists.");
    if (account.password !== currentPassword) {
      throw new UnprocessableError("That is not your current password.");
    }
    if (newPassword.length < PASSWORD_MIN) {
      throw new UnprocessableError(
        `A password needs at least ${PASSWORD_MIN} characters.`,
      );
    }
    if (newPassword === currentPassword) {
      throw new UnprocessableError("The new password is the same as the old one.");
    }
    writePassword(userId, newPassword);
    await settle(null);
  },
};

/**
 * Everything a signed-in person may do in one restaurant, resolved from their
 * membership. Exported so the fixture services can refuse a write the same way
 * the server would, rather than trusting that a screen hid the button.
 */
export function permissionsFor(restaurantId: number): ReadonlySet<Permission> {
  const userId = readSessionUserId();
  if (userId === null) return new Set();
  const row = allStaff().find(
    (member) =>
      member.user_id === userId && member.restaurant_id === restaurantId && member.is_active,
  );
  return row === undefined ? new Set() : resolvePermissions(row.role, row.granted);
}

export { requireSignedIn };
