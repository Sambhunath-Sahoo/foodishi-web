"use client";

/**
 * Your own account: the two things anybody may change about themselves.
 *
 * Both go through the session rather than a screen-local copy, so the name in
 * the header changes the moment it is saved.
 */
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { services } from "../services";
import { useSession } from "../session";
import type { Profile } from "../types";
import type { PasswordChange, ProfilePatch } from "../services/types";

export function useUpdateMyProfile(): UseMutationResult<Profile, Error, ProfilePatch> {
  const { refresh } = useSession();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => services.identity.updateMyProfile(patch),
    onSuccess: refresh,
  });
}

export function useChangeMyPassword(): UseMutationResult<void, Error, PasswordChange> {
  return useMutation({
    // Nothing to invalidate: the session is unchanged, and deliberately so —
    // changing your password must not sign you out of the tablet you are
    // standing at mid-service.
    mutationFn: (change: PasswordChange) => services.identity.changeMyPassword(change),
  });
}
