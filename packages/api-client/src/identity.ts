/**
 * @deprecated PHASE-1 STAND-IN — NOT AUTHENTICATION, and dead against the
 * live API.
 *
 * Real auth has landed: the API runs with AUTH_ENABLED=true, verifies a
 * Supabase ES256 access token against the project JWKS, and 401s on the
 * unsigned `X-Dev-User-Id` header this module fed. `apiFetch` strips that
 * header now, so nothing here reaches the server any more.
 *
 * Use `SessionProvider` / `useSession` from ./auth instead. This file stays
 * only so the three apps compile while their call sites move over; delete it
 * once nothing imports it.
 */

const USER_ID_KEY = "foodishi.dev.userId";
const RESTAURANT_ID_KEY = "foodishi.dev.restaurantId";

type IdentityListener = () => void;

const listeners = new Set<IdentityListener>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function read(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    const value = window.localStorage.getItem(key);
    return value !== null && value.trim() !== "" ? value : null;
  } catch {
    // Private browsing and blocked storage both throw. An unset identity is
    // a valid state, so degrade instead of taking the app down.
    return null;
  }
}

function write(key: string, value: string | null): void {
  if (!isBrowser()) return;
  try {
    if (value === null || value.trim() === "") {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Same as read: storage may be unavailable. The in-memory switch still
    // works for this tab because listeners fire regardless.
  }
  for (const listener of listeners) listener();
}

export function getUserId(): string | null {
  return read(USER_ID_KEY);
}

export function setUserId(userId: string | null): void {
  write(USER_ID_KEY, userId);
}

export function getRestaurantId(): string | null {
  return read(RESTAURANT_ID_KEY);
}

export function setRestaurantId(restaurantId: string | null): void {
  write(RESTAURANT_ID_KEY, restaurantId);
}

export function clearIdentity(): void {
  write(USER_ID_KEY, null);
  write(RESTAURANT_ID_KEY, null);
}

/** Subscribe to switcher changes; returns the unsubscribe function. */
export function subscribeToIdentity(listener: IdentityListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface DevIdentity {
  readonly userId: string | null;
  readonly restaurantId: string | null;
}

export function getIdentity(): DevIdentity {
  return { userId: getUserId(), restaurantId: getRestaurantId() };
}

/**
 * Throws with a message an operator can act on, rather than sending
 * `user_id=null` and reading a 422 back.
 */
export function requireUserId(): string {
  const userId = getUserId();
  if (userId === null) {
    throw new Error(
      "No user selected. Pick one in the dev identity switcher (top right).",
    );
  }
  return userId;
}

export function requireRestaurantId(): string {
  const restaurantId = getRestaurantId();
  if (restaurantId === null) {
    throw new Error(
      "No restaurant selected. Pick one in the dev identity switcher (top right).",
    );
  }
  return restaurantId;
}
