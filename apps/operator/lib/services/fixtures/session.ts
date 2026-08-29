import type { OperatorAccount, SessionService } from "../types";
import { settle, settleWrite, UnauthorizedError } from "./latency";
import { DEV_PASSPHRASE, SEED_STAFF } from "./seed";

/**
 * THIS IS NOT AUTHENTICATION.
 *
 * The console is UI-only: there is no server, no token, no session cookie and
 * nothing to verify against. "Signing in" here matches an email address against
 * ./data/staff.json and one shared phrase, then writes the email to
 * localStorage. It gates nothing an attacker could not reach by opening the
 * bundle, and it protects no data — everything the console renders is already in
 * the JavaScript that served the sign-in screen.
 *
 * It exists for two honest reasons. The console has to know whose name goes in
 * the header, and the sign-in screen is a real screen that a real deployment
 * will need — so it is built now, against this seam, rather than bolted on later
 * around a shape that never had a session in it.
 *
 * When the backend arrives, this file is replaced by the real thing:
 * @repo/api-client's SessionProvider verifies an ES256 bearer token, reads the
 * caller's profile from GET /me, and refuses anyone without an active row in
 * platform_staff. `SessionService` is deliberately the shape that supports —
 * `current`, `signIn`, `signOut` — so the swap is one file.
 */
const STORAGE_KEY = "foodishi.operator.session.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStoredEmail(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked. Signed out is the honest answer, not a crash.
    return null;
  }
}

function storeEmail(email: string | null): void {
  if (!isBrowser()) return;
  try {
    if (email === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, email);
  } catch {
    // The session then lasts as long as the tab, which is good enough.
  }
}

function findAccount(email: string): OperatorAccount | null {
  const wanted = email.trim().toLowerCase();
  return SEED_STAFF.find((account) => account.email.toLowerCase() === wanted) ?? null;
}

export const fixtureSession: SessionService = {
  current: async () => {
    const email = readStoredEmail();
    return email === null ? null : findAccount(email);
  },

  signIn: async (email, passphrase) => {
    const account = findAccount(email);

    // One refusal for both halves on purpose: telling an unknown address that
    // it is unknown is the one place this screen could leak something real.
    if (account === null || passphrase !== DEV_PASSPHRASE) {
      throw new UnauthorizedError(
        "That is not one of the seeded operations accounts. The sign-in details are printed below the form.",
      );
    }

    storeEmail(account.email);
    return settleWrite(account);
  },

  signOut: async () => {
    storeEmail(null);
    await settleWrite(null);
  },

  listAccounts: () => settle(SEED_STAFF),
};

/** Printed on the sign-in screen. See the note at the top of this file. */
export { DEV_PASSPHRASE };
