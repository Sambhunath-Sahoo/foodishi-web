/**
 * Carry browser-stored state across the Tadka to Foodishi rename.
 *
 * Every store in all three apps keys its localStorage entry on a product-name
 * prefix: it was `tadka.customer.cart.v1`, `tadka.operator.nav.collapsed`,
 * `tadka.partner.restaurant.<id>` and so on. Renaming the product renames the
 * keys, and a renamed key reads as absent — so without this a customer's cart,
 * their favourites, a manager's selected restaurant and every saved filter would
 * silently reset to empty on the deploy that shipped the rename.
 *
 * A PREFIX WALK, not a list of keys. There were nine read sites and one of the
 * keys is built at runtime (`tadka.partner.restaurant.` plus a restaurant id),
 * so an explicit rename table would be both a maintenance burden and incomplete
 * by construction. Walking what is actually in storage cannot miss one.
 *
 * Runs ONCE per page load, from ApiProvider, which all three apps mount at the
 * root of their layout. React evaluates a parent's body before its children's
 * `useState` initialisers, and every store here reads storage lazily in such an
 * initialiser — so calling this from the provider body is early enough that no
 * store has looked yet. That ordering is the reason this is not a `useEffect`.
 *
 * DELETABLE. Once no browser can still be holding `tadka.*` keys — a few weeks
 * after the rename ships, or immediately if this never reached real users —
 * delete this file, its export, and the call in ApiProvider. It is a migration,
 * not a permanent layer.
 */

// The OLD product name, deliberately hard-coded and deliberately NOT rebranded.
//
// A global Tadka-to-Foodishi rename rewrote this line once already, making both
// prefixes identical -- which turned the migration into a no-op that deleted
// every key it walked instead of carrying it across. This constant is history,
// not branding: it must keep saying "tadka." for as long as this file exists.
const LEGACY_PREFIX = "tadka.";
const CURRENT_PREFIX = "foodishi.";

/** Set once this has run, so a re-render does not walk storage again. */
let hasRun = false;

export interface StorageMigrationResult {
  /** Keys copied to the new prefix. */
  readonly moved: number;
  /** Keys skipped because the new prefix already held a value. */
  readonly kept: number;
}

/**
 * Rename every `tadka.*` key to `foodishi.*`, preserving its value.
 *
 * Idempotent, and safe to call when there is nothing to do. An existing value
 * under the NEW key always wins: it is newer by definition, since nothing writes
 * the legacy prefix any more, and overwriting it would be the data loss this
 * function exists to prevent.
 */
export function migrateLegacyStorageKeys(): StorageMigrationResult {
  const empty: StorageMigrationResult = { moved: 0, kept: 0 };
  if (hasRun) return empty;
  hasRun = true;

  // Server render, or a browser with storage blocked. `window` alone is not
  // enough of a guard: Safari in private mode has thrown on the ACCESSOR itself.
  let storage: Storage;
  try {
    if (typeof window === "undefined") return empty;
    storage = window.localStorage;
  } catch {
    return empty;
  }

  try {
    // Collected before writing. Mutating storage while iterating its indices
    // shifts them, which would skip keys.
    const legacyKeys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key !== null && key.startsWith(LEGACY_PREFIX)) legacyKeys.push(key);
    }
    if (legacyKeys.length === 0) return empty;

    let moved = 0;
    let kept = 0;
    for (const legacyKey of legacyKeys) {
      const currentKey = CURRENT_PREFIX + legacyKey.slice(LEGACY_PREFIX.length);
      const value = storage.getItem(legacyKey);

      if (value !== null && storage.getItem(currentKey) === null) {
        storage.setItem(currentKey, value);
        moved += 1;
      } else {
        kept += 1;
      }
      // Removed either way: the legacy key is dead once the new one is
      // authoritative, and leaving it behind means walking it on every load
      // forever.
      storage.removeItem(legacyKey);
    }
    return { moved, kept };
  } catch {
    // A quota error part-way through leaves some keys moved and some not, which
    // is survivable: each store validates what it reads and falls back to its
    // own empty state. Losing a cart is not worth taking the page down for.
    return empty;
  }
}
