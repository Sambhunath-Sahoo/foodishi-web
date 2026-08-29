"use client";

import * as React from "react";

/**
 * A value that lags behind by `delayMs`.
 *
 * For the search boxes, whose value goes straight into a query key: without
 * this, typing "Butter Chicken" is fourteen requests and thirteen of them are
 * for a prefix nobody wanted.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = React.useState(value);

  React.useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), delayMs);
    return () => {
      window.clearTimeout(id);
    };
  }, [value, delayMs]);

  return settled;
}
