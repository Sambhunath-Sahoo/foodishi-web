/**
 * The date ranges every reporting surface offers, named once.
 *
 * Three, not a date picker. A restaurant manager standing in their own kitchen
 * asks three questions — how is today going, how was the week, how was the
 * month — and a pair of calendar inputs makes all three slower to answer. The
 * day is inclusive at both ends, so "7 days" means today and the six before it.
 */
import { daysAgoDate, toLocalDate } from "./format";
import type { ReportWindow } from "../../lib/types";

export type RangeKey = "today" | "7d" | "30d";

export const RANGE_OPTIONS: readonly {
  readonly value: RangeKey;
  readonly label: string;
}[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

const DAYS_BACK: Record<RangeKey, number> = { today: 0, "7d": 6, "30d": 29 };

export function windowFor(range: RangeKey, now: number): ReportWindow {
  return { from: daysAgoDate(DAYS_BACK[range], now), to: toLocalDate(now) };
}

/** For a caption, so a number on screen always says which days it covers. */
export function describeRange(range: RangeKey): string {
  if (range === "today") return "Since midnight";
  return `Today and the previous ${DAYS_BACK[range]} days`;
}

/** How many whole days the range spans, for a per-day average. */
export function daysIn(range: RangeKey): number {
  return DAYS_BACK[range] + 1;
}
