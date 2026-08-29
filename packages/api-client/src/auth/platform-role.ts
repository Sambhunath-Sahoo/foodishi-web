/**
 * The Foodishi platform-staff ladder, mirroring PLATFORM_ROLE_RANK in the API's
 * app/dependencies/identity.py. One rank today — admin — and still a rank
 * comparison rather than an equality test: the moment a second role exists, a
 * screen that asks for the lower one has to open for admin too, and an equality
 * check written now is the bug that gets found then.
 *
 * No imports on purpose — the provider and the gate both need this, and neither
 * should have to pull the fetcher in to compare two ranks.
 */
export type PlatformRole = "admin";

const PLATFORM_ROLE_RANK: Readonly<Record<PlatformRole, number>> = {
  admin: 1,
};

/** How each rank is named to a person, for a refusal that says what it wanted. */
export const PLATFORM_ROLE_LABEL: Readonly<Record<PlatformRole, string>> = {
  admin: "Admin",
};

/**
 * True when `role` sits at or above `minimum`. Null and undefined — a customer,
 * a restaurant staffer, or a profile that has not answered yet — never do.
 */
export function hasPlatformRole(
  role: PlatformRole | null | undefined,
  minimum: PlatformRole,
): boolean {
  if (role === undefined || role === null) return false;
  return PLATFORM_ROLE_RANK[role] >= PLATFORM_ROLE_RANK[minimum];
}
