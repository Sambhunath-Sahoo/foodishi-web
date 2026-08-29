"use client";

import * as React from "react";

/**
 * A ticking `Date.now()`. Every "12 min ago" and every countdown on this
 * tablet reads from one clock, so two cards can never disagree by a second.
 *
 * The interval is a data refresh, not an animation, so it keeps running under
 * prefers-reduced-motion — but nothing it drives moves or fades.
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => {
      window.clearInterval(id);
    };
  }, [intervalMs]);

  return now;
}

export const TICK_QUEUE_MS = 15_000;
export const TICK_DETAIL_MS = 1_000;
