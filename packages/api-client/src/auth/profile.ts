import { api } from "../fetcher";
import type { components } from "../types/api";
import type { PlatformRole } from "./platform-role";

/**
 * The profile half of auth. Supabase proves *who is calling*; `public.users`
 * says *which Foodishi profile that is*. They are joined by /auth/link, and read
 * back through /me.
 *
 * Kept apart from session.ts on purpose: session.ts must stay free of any
 * import from the fetcher, because the fetcher imports it for the token.
 */
export type UserProfile = components["schemas"]["UserRead"];
export type MyRestaurant = components["schemas"]["MyRestaurantRead"];

/**
 * What /me adds on top of the shared UserRead columns: the caller's own
 * platform rank. Null is the answer for almost everyone — a customer or a
 * restaurant staffer is not platform staff — and optional because the field
 * arrives with the API change now in flight, so a dev pointed at an older API
 * gets `undefined` rather than a type that lies.
 *
 * Widened by hand for the same reason PlatformRole is declared by hand; drop
 * the intersection once `pnpm --filter @repo/api-client gen` puts
 * `platform_role` on UserRead itself.
 */
export type MyProfile = UserProfile & {
  readonly platform_role?: PlatformRole | null;
};

/**
 * What a brand-new signup tells us about itself. No email field — the address
 * comes from the verified token and nowhere else.
 */
export type ProfileLinkPayload = components["schemas"]["ProfileLink"];

/**
 * Attach the signed-in identity to a public.users profile, matching on the
 * token's email. Idempotent, so it is safe to retry. 409 means the account is
 * deactivated or the email already belongs to someone else — show the detail.
 */
export function linkProfile(payload: ProfileLinkPayload): Promise<UserProfile> {
  return api.post<UserProfile>("/auth/link", payload);
}

/**
 * The caller's own profile. 404 here is not an error state to hide: it means
 * this identity has never been linked, and the server's detail already names
 * /auth/link. Pass it through untouched.
 */
export function fetchMyProfile(signal?: AbortSignal): Promise<MyProfile> {
  return api.get<MyProfile>("/me", { signal });
}

/** Only the restaurants this caller may act for. Empty for a plain customer. */
export function fetchMyRestaurants(signal?: AbortSignal): Promise<MyRestaurant[]> {
  return api.get<MyRestaurant[]>("/me/restaurants", { signal });
}
