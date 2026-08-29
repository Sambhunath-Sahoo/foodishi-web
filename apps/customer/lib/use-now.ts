"use client";

import * as React from "react";

const ONE_SECOND_MS = 1_000;

/**
 * A ticking clock for the countdown to `promised_at`. Everything else on the
 * tracking screen comes from the API; only the seconds between polls are
 * counted here.
 *
 * Nothing ticks once the order has settled — `enabled: false` stops the timer
 * rather than re-rendering a delivered order forever.
 */
export function useNow(enabled: boolean, intervalMs = ONE_SECOND_MS): Date {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, intervalMs]);

  return now;
}
