"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { api, useSession } from "@repo/api-client";
import { isFixtureSource } from "../services";
import { useFixtureIdentity } from "../services/fixtures/identity";
import type { UserProfileRead, UserProfileUpdate } from "../types";

/**
 * The editable half of an account.
 *
 * PATCH /me takes its subject from the token, so there is no id to send and no
 * way to aim the update at somebody else — the same reason /me/orders is used
 * for history instead of /orders?user_id=.
 *
 * Email is deliberately absent from everything here even though UserUpdate
 * accepts it: the address is what /auth/link matches a Supabase identity to, so
 * changing it in `public.users` alone would leave this person signing in with
 * one address and owning a profile under another.
 */

/** UserUpdate's own bounds, mirrored so a bad value never leaves the phone. */
const NAME_MIN = 2;
const NAME_MAX = 120;
const PHONE_MIN = 7;
const PHONE_MAX = 20;
const CITY_MIN = 2;
const CITY_MAX = 60;

export interface ProfileDraft {
  readonly name: string;
  readonly phone: string;
  readonly city: string;
}

export type ProfileErrors = {
  readonly [Key in keyof ProfileDraft]?: string;
};

export const PROFILE_LIMITS = {
  nameMin: NAME_MIN,
  nameMax: NAME_MAX,
  phoneMin: PHONE_MIN,
  phoneMax: PHONE_MAX,
  cityMin: CITY_MIN,
  cityMax: CITY_MAX,
} as const;

function trim(draft: ProfileDraft): ProfileDraft {
  return {
    name: draft.name.trim(),
    phone: draft.phone.trim(),
    city: draft.city.trim(),
  };
}

/**
 * The fields that actually changed, and never a null.
 *
 * UserUpdate rejects an explicit null outright — every one of these columns is
 * NOT NULL — and refuses an empty body with "Provide at least one field to
 * update", so sending the whole form back unchanged is not the harmless no-op
 * it looks like. Trimmed before comparing because the schema strips whitespace
 * server-side too, which makes " Asha " and "Asha" the same edit.
 */
export function toProfileChanges(
  current: ProfileDraft,
  draft: ProfileDraft,
): UserProfileUpdate {
  const next = trim(draft);
  const was = trim(current);
  return {
    ...(next.name !== was.name ? { name: next.name } : {}),
    ...(next.phone !== was.phone ? { phone: next.phone } : {}),
    ...(next.city !== was.city ? { city: next.city } : {}),
  };
}

export function hasProfileChanges(changes: UserProfileUpdate): boolean {
  return Object.keys(changes).length > 0;
}

/**
 * Client-side length checks, so an over-long name is refused with the field
 * highlighted rather than as a 422 the customer has to decode. The server still
 * has the last word — whatever it refuses is printed verbatim beside the form.
 */
export function validateProfileDraft(draft: ProfileDraft): ProfileErrors {
  const next = trim(draft);
  return {
    ...(next.name.length < NAME_MIN || next.name.length > NAME_MAX
      ? { name: `A name is ${NAME_MIN}–${NAME_MAX} characters.` }
      : {}),
    ...(next.phone.length < PHONE_MIN || next.phone.length > PHONE_MAX
      ? { phone: `A phone number is ${PHONE_MIN}–${PHONE_MAX} characters.` }
      : {}),
    ...(next.city.length < CITY_MIN || next.city.length > CITY_MAX
      ? { city: `A city is ${CITY_MIN}–${CITY_MAX} characters.` }
      : {}),
  };
}

/**
 * Save the caller's own profile.
 *
 * Nothing is cached under a react-query key here on purpose: the profile every
 * screen reads lives in SessionProvider, not in the query cache, so the write
 * finishes by re-reading GET /me rather than by invalidating a key. That is the
 * same move ProfileLinkForm makes after /auth/link.
 */
export function useUpdateProfile(): UseMutationResult<
  UserProfileRead,
  Error,
  UserProfileUpdate
> {
  const { refreshProfile } = useSession();
  const fixture = useFixtureIdentity();

  return useMutation<UserProfileRead, Error, UserProfileUpdate>({
    mutationFn: async (payload) => {
      // The fixture source has no PATCH /me; the edit lands on the identity
      // overlay instead, which every screen reads through useAccount.
      if (isFixtureSource) {
        fixture.updateProfile(payload as Partial<UserProfileRead>);
        const updated = fixture.profile;
        if (updated === null) throw new Error("Sign in before editing your profile.");
        return { ...updated, ...(payload as Partial<UserProfileRead>) };
      }
      return api.patch<UserProfileRead>("/me", payload);
    },
    onSuccess: async () => {
      // Without this the header keeps the old name until a reload. The fixture
      // store notifies its own subscribers, so there is nothing to re-read.
      if (isFixtureSource) return;
      await refreshProfile();
    },
  });
}
