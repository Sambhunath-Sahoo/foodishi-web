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

type Sortable = number | string | null | undefined;

/** Nulls always sink, whichever way the column is pointing. */
function compareSortable(left: Sortable, right: Sortable): number {
  const leftMissing = left === null || left === undefined;
  const rightMissing = right === null || right === undefined;
  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;
  if (typeof left === "string" || typeof right === "string") {
    return String(left).localeCompare(String(right));
  }
  return left - right;
}

export function sortRows<TRow, TKey extends string>(
  rows: readonly TRow[],
  sort: SortState<TKey>,
  select: (row: TRow, key: TKey) => Sortable,
): TRow[] {
  const nullsSinkBoth = sort.direction === "asc" ? 1 : -1;
  // Copied before sorting: Array.prototype.sort mutates in place, and the
  // query cache owns the array it handed us.
  return [...rows].sort((left, right) => {
    const value = compareSortable(select(left, sort.key), select(right, sort.key));
    return value * nullsSinkBoth;
  });
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
