/**
 * Client-side sorting for the tables that arrive as one page. Nothing here
 * paginates: /admin/metrics/restaurants returns 25 rows and /coupons returns
 * nine, so sorting in the browser is honest rather than a shortcut.
 */

export type SortDirection = "asc" | "desc";

export interface SortState<TKey extends string> {
  readonly key: TKey;
  readonly direction: SortDirection;
}

/** Clicking the active column flips it; clicking another starts it fresh. */
export function toggleSort<TKey extends string>(
  current: SortState<TKey>,
  key: TKey,
  initialDirection: SortDirection = "desc",
): SortState<TKey> {
  if (current.key !== key) return { key, direction: initialDirection };
  return {
    key,
    direction: current.direction === "asc" ? "desc" : "asc",
  };
}

export type Sortable = number | string | null | undefined;

function isMissing(value: Sortable): value is null | undefined {
  return value === null || value === undefined;
}

/** Two present values, ascending. Strings compare as text, numbers as numbers. */
function comparePresent(left: string | number, right: string | number): number {
  if (typeof left === "string" || typeof right === "string") {
    return String(left).localeCompare(String(right));
  }
  return left - right;
}

/**
 * Nulls always sink, whichever way the column is pointing.
 *
 * The missing-value branch has to be settled BEFORE the direction is applied.
 * This used to compare everything first and then multiply the result by -1 for
 * a descending sort — which flipped "null sinks" into "null floats" too, so on
 * "Above typical ▼" every kitchen with no deliveries ("—") sat above the one
 * running fourteen minutes over (OP-8). Direction only ever applies to two
 * values that are both there.
 */
export function compareForSort(
  left: Sortable,
  right: Sortable,
  direction: SortDirection,
): number {
  const leftMissing = isMissing(left);
  const rightMissing = isMissing(right);
  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;
  const ascending = comparePresent(left, right);
  return direction === "asc" ? ascending : -ascending;
}

export function sortRows<TRow, TKey extends string>(
  rows: readonly TRow[],
  sort: SortState<TKey>,
  select: (row: TRow, key: TKey) => Sortable,
): TRow[] {
  // Copied before sorting: Array.prototype.sort mutates in place, and the
  // query cache owns the array it handed us.
  return [...rows].sort((left, right) =>
    compareForSort(select(left, sort.key), select(right, sort.key), sort.direction),
  );
}

/** The screen-reader and visual state of a sortable column header. */
export function sortIndicator(
  sort: SortState<string>,
  key: string,
): { readonly isActive: boolean; readonly ariaSort: "ascending" | "descending" | "none" } {
  if (sort.key !== key) return { isActive: false, ariaSort: "none" };
  return {
    isActive: true,
    ariaSort: sort.direction === "asc" ? "ascending" : "descending",
  };
}
