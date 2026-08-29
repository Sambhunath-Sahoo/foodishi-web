"use client";

import * as React from "react";

const DEFAULT_DELAY_MS = 300;

/**
 * Search boxes fire a request per keystroke otherwise. The typed value stays
 * on screen immediately; only the value the query reads is delayed.
 */
export function useDebounced<TValue>(value: TValue, delayMs = DEFAULT_DELAY_MS): TValue {
  const [settled, setSettled] = React.useState(value);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
