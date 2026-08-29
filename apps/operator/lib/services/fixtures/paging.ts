import type { Page } from "../../api-types";
import type { PageQuery } from "../types";

/**
 * One window of a list, in the envelope every API list endpoint returns.
 *
 * The slice happens here rather than in the caller on purpose: a page that
 * received all 420 orders and sliced them itself would behave differently the
 * day that list is answered by a server, and its footer would be stating a
 * total it had counted rather than one it was told.
 */
export function toPage<T>(rows: readonly T[], query: PageQuery): Page<T> {
  const limit = Math.max(1, query.limit);
  // An offset past the end returns no rows and the real total, exactly as the
  // server does — it does not quietly snap back to the last page.
  const offset = Math.max(0, query.offset);
  return {
    items: rows.slice(offset, offset + limit),
    total: rows.length,
    limit,
    offset,
  };
}

/** A whole list in the same envelope, for the endpoints that never page. */
export function toWholePage<T>(rows: readonly T[]): Page<T> {
  return { items: rows, total: rows.length, limit: Math.max(1, rows.length), offset: 0 };
}

/** Case- and space-insensitive contains, for every search box in the console. */
export function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}
