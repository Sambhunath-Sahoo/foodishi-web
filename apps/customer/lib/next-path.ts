/**
 * Where a sign-in should return to.
 *
 * `?next=` is attacker-controllable — anyone can post a link to
 * /login?next=https://evil.example — so only a same-site absolute path is ever
 * honoured. `//host` and `/\host` are protocol-relative URLs the browser reads
 * as another origin, which is why the second character is checked too.
 */
export const DEFAULT_RETURN_PATH = "/";

export function toSafeReturnPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_RETURN_PATH,
): string {
  if (raw === null || raw === undefined) return fallback;

  const value = raw.trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;

  return value;
}

/** Build a /login link that comes back here afterwards. */
export function toLoginHref(returnPath: string, path = "/login"): string {
  const safe = toSafeReturnPath(returnPath);
  if (safe === DEFAULT_RETURN_PATH) return path;
  return `${path}?next=${encodeURIComponent(safe)}`;
}
