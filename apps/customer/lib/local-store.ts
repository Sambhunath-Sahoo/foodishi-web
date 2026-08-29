"use client";

import * as React from "react";

/**
 * A tiny store over one localStorage key, shared by every component reading it.
 *
 * Favourites, reviews and support tickets have no API behind them yet, so they
 * live in the browser — the same place the cart lives, for the same reason.
 * When endpoints arrive, each feature swaps this for a TanStack query and the
 * components above it do not change.
 *
 * Module-level rather than a React context: a heart on a restaurant card and
 * the favourites page have to agree without threading a provider through every
 * route. A write notifies every subscriber in this tab; the `storage` event
 * covers the other tabs.
 *
 * Every update returns a new value. Nothing is mutated in place.
 */

type Listener = () => void;

export interface LocalStore<T> {
  /**
   * `[value, isReady]`. `isReady` stays false until localStorage has been read,
   * so the server render and the first client render agree and the UI can hold
   * a skeleton instead of flashing an empty state it is about to contradict.
   */
  readonly use: () => readonly [T, boolean];
  readonly update: (next: (current: T) => T) => void;
}

export function createLocalStore<T>(
  key: string,
  fallback: T,
  parse: (raw: unknown) => T,
): LocalStore<T> {
  const listeners = new Set<Listener>();
  let cached: T = fallback;
  let hasRead = false;

  /** Read through the cache so every subscriber shares one object identity. */
  function read(): T {
    if (hasRead) return cached;
    hasRead = true;
    try {
      const raw = window.localStorage.getItem(key);
      cached = raw === null ? fallback : parse(JSON.parse(raw) as unknown);
    } catch {
      // Unparseable JSON, an older build's shape, or storage blocked in
      // private browsing. The fallback keeps the feature usable either way.
      cached = fallback;
    }
    return cached;
  }

  function update(next: (current: T) => T): void {
    cached = next(read());
    hasRead = true;
    try {
      window.localStorage.setItem(key, JSON.stringify(cached));
    } catch {
      // Losing persistence must not lose the value for this tab.
    }
    for (const listener of listeners) listener();
  }

  function use(): readonly [T, boolean] {
    const [value, setValue] = React.useState<T>(fallback);
    const [isReady, setIsReady] = React.useState(false);

    React.useEffect(() => {
      setValue(read());
      setIsReady(true);

      const onWrite: Listener = () => setValue(read());
      listeners.add(onWrite);

      // Another tab wrote this key: drop the cache so the next read is fresh.
      const onStorage = (event: StorageEvent): void => {
        if (event.key !== null && event.key !== key) return;
        hasRead = false;
        setValue(read());
      };
      window.addEventListener("storage", onStorage);

      return () => {
        listeners.delete(onWrite);
        window.removeEventListener("storage", onStorage);
      };
    }, []);

    return [value, isReady] as const;
  }

  return { use, update };
}

/** Never trust storage: another tab, an older build or a user can write it. */
export function parseList<T>(
  raw: unknown,
  isItem: (value: unknown) => value is T,
): readonly T[] {
  return Array.isArray(raw) ? raw.filter(isItem) : [];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * An id for a row the server has never seen. Not a UUID on purpose: these rows
 * are local, and a readable prefix makes a stray one obvious in devtools.
 */
export function localId(prefix: string): string {
  const stamp = Date.now().toString(36);
  const noise = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${stamp}${noise}`;
}
