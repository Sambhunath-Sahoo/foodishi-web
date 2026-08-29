"use client";

import * as React from "react";

/** Lateness is measured in minutes, so a half-minute tick is plenty. */
const DEFAULT_TICK_MS = 30_000;

/**
 * The wall clock as React state.
 *
 * Null on the server and on the first client render on purpose: every "12 min
 * late" label is derived from `Date.now()`, and a value that differs between
 * the server render and hydration is a mismatch. Callers render the clock-
 * dependent part only once this is a number.
 */
export function useNow(tickMs: number = DEFAULT_TICK_MS): number | null {
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, tickMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [tickMs]);

  return now;
}
