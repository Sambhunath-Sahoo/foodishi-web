"use client";

import * as React from "react";
import { Button } from "@repo/ui";
import { formatCount } from "../lib/format";
import { useOrdersOverTime } from "../lib/queries";

/** The widest window the day-by-day views offer. */
export const WIDEST_WINDOW_DAYS = 90;

export interface WidenWindowProps {
  /** The window the empty view is showing now. */
  readonly days: number;
  readonly onWiden: (days: number) => void;
}

/**
 * "Show 90 days · 153 orders" — the empty state's way out (OP-5).
 *
 * The demo data is six weeks old, so every 7- and 30-day default on the
 * console opened blank while the platform held 153 orders, and the empty state
 * only said "widen the range". This counts the widest window first and offers
 * it only when it would actually bring rows back: a button that led to a
 * second empty screen would be worse than the sentence it replaced.
 *
 * The count reads the same cached per-day series the Overview chart draws, so
 * offering it costs one request at most.
 */
export function WidenWindow({ days, onWiden }: WidenWindowProps): React.JSX.Element | null {
  const wider = useOrdersOverTime(WIDEST_WINDOW_DAYS);
  if (days >= WIDEST_WINDOW_DAYS || wider.data === undefined) return null;

  const orders = wider.data.reduce((sum, point) => sum + point.order_count, 0);
  if (orders === 0) return null;

  return (
    <Button size="sm" onClick={() => onWiden(WIDEST_WINDOW_DAYS)}>
      Show {formatCount(WIDEST_WINDOW_DAYS)} days · {formatCount(orders)} orders
    </Button>
  );
}
