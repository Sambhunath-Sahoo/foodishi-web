"use client";

import { createLocalStore, isRecord } from "../../local-store";
import type { UserProfileRead } from "../../types";

import profileSeed from "./data/profile.json";

/**
 * Who is signed in, when the data source is `fixtures`.
 *
 * Real identity is Supabase plus `GET /me`, and neither exists here: the point
 * of the fixture source is that the UI runs with nothing behind it. So this
 * stands in for a session — it proves nothing and grants nothing, and every
 * screen it unlocks is reading bundled JSON anyway.
 *
 * The password is checked against one shared constant so the sign-in screen
 * has a real failure path to show. That is a UI affordance, not a security
 * boundary. **Never** let this run against a real backend: ./index.ts picks
 * this only when NEXT_PUBLIC_DATA_SOURCE is `fixtures`.
 */
const STORAGE_KEY = "foodishi.customer.fixture-identity.v1";

/** The one password every demo customer accepts. */
export const DEMO_PASSWORD = "foodishidev2026";

const SEED_PROFILE = profileSeed as UserProfileRead;

/**
 * The customers this fixture set can sign in as. Only the first has order
 * history — the others exist so the empty states are reachable too.
 */
export const DEMO_CUSTOMERS: readonly UserProfileRead[] = [
  SEED_PROFILE,
  {
    ...SEED_PROFILE,
    id: 9001,
    name: "Arjun Nair",
    email: "arjun.nair@example.com",
    phone: "9876500101",
    city: "Pune",
    avatar_url: null,
  },
];

interface FixtureIdentity {
  /** The signed-in profile id, or null when signed out. */
  readonly userId: number | null;
  /** Edits made on the profile screen, which has no PATCH /me to call. */
  readonly overrides: Readonly<Record<string, Partial<UserProfileRead>>>;
  /** Accounts created through the sign-up screen in this browser. */
  readonly created: readonly UserProfileRead[];
}

const EMPTY: FixtureIdentity = { userId: null, overrides: {}, created: [] };

/** Above every demo id, so a created account cannot collide with one. */
const FIRST_CREATED_ID = 90_001;

function parseIdentity(raw: unknown): FixtureIdentity {
  if (!isRecord(raw)) return EMPTY;
  const overrides: Record<string, Partial<UserProfileRead>> = {};
  if (isRecord(raw.overrides)) {
    for (const [key, value] of Object.entries(raw.overrides)) {
      if (isRecord(value)) overrides[key] = value as Partial<UserProfileRead>;
    }
  }
  const created = Array.isArray(raw.created)
    ? raw.created.filter(
        (row): row is UserProfileRead =>
          isRecord(row) && typeof row.id === "number" && typeof row.email === "string",
      )
    : [];
  return {
    userId: typeof raw.userId === "number" ? raw.userId : null,
    overrides,
    created,
  };
}

const store = createLocalStore<FixtureIdentity>(STORAGE_KEY, EMPTY, parseIdentity);

export class FixtureAuthError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(detail);
    this.name = "FixtureAuthError";
    this.detail = detail;
  }
}

function baseProfile(
  userId: number,
  created: readonly UserProfileRead[],
): UserProfileRead | null {
  return (
    DEMO_CUSTOMERS.find((customer) => customer.id === userId) ??
    created.find((customer) => customer.id === userId) ??
    null
  );
}

export interface FixtureIdentityApi {
  readonly profile: UserProfileRead | null;
  readonly isReady: boolean;
  readonly signIn: (email: string, password: string) => Promise<void>;
  /** Creates the account and signs straight in — there is no email to confirm. */
  readonly signUp: (email: string, password: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
  readonly updateProfile: (changes: Partial<UserProfileRead>) => void;
}

export function useFixtureIdentity(): FixtureIdentityApi {
  const [identity, isReady] = store.use();

  const base =
    identity.userId === null
      ? null
      : baseProfile(identity.userId, identity.created);
  const profile =
    base === null
      ? null
      : { ...base, ...(identity.overrides[String(base.id)] ?? {}) };

  return {
    profile,
    isReady,

    signIn: (email, password) => {
      const wanted = email.trim().toLowerCase();
      const match = [...DEMO_CUSTOMERS, ...identity.created].find(
        (customer) => customer.email.toLowerCase() === wanted,
      );
      if (match === undefined) {
        return Promise.reject(
          new FixtureAuthError("No demo customer with that email address."),
        );
      }
      if (password !== DEMO_PASSWORD) {
        return Promise.reject(
          new FixtureAuthError("That password is not the demo password."),
        );
      }
      store.update((current) => ({ ...current, userId: match.id }));
      return Promise.resolve();
    },

    signUp: (email, password) => {
      const wanted = email.trim().toLowerCase();
      const taken = [...DEMO_CUSTOMERS, ...identity.created].some(
        (customer) => customer.email.toLowerCase() === wanted,
      );
      if (taken) {
        return Promise.reject(
          new FixtureAuthError("An account with that email already exists."),
        );
      }
      if (password !== DEMO_PASSWORD) {
        return Promise.reject(
          new FixtureAuthError(
            `Use the demo password "${DEMO_PASSWORD}" — this source does not store real ones.`,
          ),
        );
      }
      store.update((current) => {
        const id =
          Math.max(FIRST_CREATED_ID - 1, ...current.created.map((row) => row.id)) + 1;
        const profile: UserProfileRead = {
          ...SEED_PROFILE,
          id,
          // Named from the address until the profile screen says otherwise.
          name: wanted.split("@")[0] ?? "New customer",
          email: wanted,
          // UserRead requires both as strings; blank is what the real flow's
          // profile-link step exists to fill in, and /profile prompts for it.
          phone: "",
          city: "",
          avatar_url: null,
          created_at: new Date().toISOString(),
        };
        return { ...current, userId: id, created: [...current.created, profile] };
      });
      return Promise.resolve();
    },

    signOut: () => {
      store.update((current) => ({ ...current, userId: null }));
      return Promise.resolve();
    },

    updateProfile: (changes) => {
      store.update((current) => {
        if (current.userId === null) return current;
        const key = String(current.userId);
        return {
          ...current,
          overrides: {
            ...current.overrides,
            [key]: { ...(current.overrides[key] ?? {}), ...changes },
          },
        };
      });
    },
  };
}
