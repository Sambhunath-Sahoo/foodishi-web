"use client";

import * as React from "react";

/**
 * How old the data on screen is, in words. A board that refreshes silently is
 * a board nobody trusts, so every live surface says when it last heard back.
 */

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
/** Below this, "2s ago" is noise — the reader is looking at fresh data. */
const JUST_NOW_SECONDS = 3;

export function formatAgo(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < JUST_NOW_SECONDS) return "just now";
  if (seconds < SECONDS_PER_MINUTE) return `${Math.floor(seconds)}s ago`;
  if (seconds < SECONDS_PER_HOUR) {
    return `${Math.floor(seconds / SECONDS_PER_MINUTE)}m ago`;
  }
  const hours = Math.floor(seconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  return minutes === 0 ? `${hours}h ago` : `${hours}h ${minutes}m ago`;
}

const DEFAULT_TICK_MS = 1000;

/**
 * Seconds elapsed since `at`, re-read on a timer.
 *
 * Returns `null` until the component has mounted. The server has no idea what
 * "3 seconds ago" means at hydration time, and rendering a guess there is how
 * you get a hydration mismatch on every live screen.
 */
export function useSecondsSince(
  at: Date | number | null | undefined,
  tickMs: number = DEFAULT_TICK_MS,
): number | null {
  const timestamp = at === null || at === undefined ? null : new Date(at).getTime();
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (timestamp === null) {
      setNow(null);
      return;
    }
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [timestamp, tickMs]);

  if (timestamp === null || now === null) return null;
  return Math.max(0, (now - timestamp) / 1000);
}
