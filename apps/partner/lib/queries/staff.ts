"use client";

/**
 * The roster.
 *
 * A change to somebody's role or grants can change what the *signed-in* person
 * may do — a manager who demotes themselves is the obvious case, and the source
 * refuses that one, but restoring your own revoked row is not. So every write
 * here invalidates the session as well as the roster, and the nav redraws from
 * the new answer rather than from what it was told at sign-in.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { services } from "../services";
import { queryKeys } from "../query-keys";
import type { ReadyKitchen } from "../kitchen";
import type { Page, Permission, StaffMember, StaffRole } from "../types";

function useInvalidateRoster(kitchen: ReadyKitchen): () => Promise<void> {
  const queryClient = useQueryClient();
  const { userId, restaurantId } = kitchen;
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(userId, restaurantId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.auth() }),
    ]);
  };
}

export function useStaff(kitchen: ReadyKitchen): UseQueryResult<Page<StaffMember>> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.staff(userId, restaurantId),
    queryFn: ({ signal }) => services.staff.list(restaurantKey, signal),
  });
}

export function useAddStaff(
  kitchen: ReadyKitchen,
): UseMutationResult<StaffMember, Error, { email: string; role: StaffRole }> {
  const invalidate = useInvalidateRoster(kitchen);
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: StaffRole }) =>
      services.staff.add({ restaurantId: kitchen.restaurantKey, email, role }),
    onSuccess: invalidate,
  });
}

export function useSetStaffRole(
  kitchen: ReadyKitchen,
): UseMutationResult<StaffMember, Error, { staffId: number; role: StaffRole }> {
  const invalidate = useInvalidateRoster(kitchen);
  return useMutation({
    mutationFn: ({ staffId, role }: { staffId: number; role: StaffRole }) =>
      services.staff.setRole(staffId, role),
    onSuccess: invalidate,
  });
}

export function useSetStaffActive(
  kitchen: ReadyKitchen,
): UseMutationResult<StaffMember, Error, { staffId: number; isActive: boolean }> {
  const invalidate = useInvalidateRoster(kitchen);
  return useMutation({
    mutationFn: ({ staffId, isActive }: { staffId: number; isActive: boolean }) =>
      services.staff.setActive(staffId, isActive),
    onSuccess: invalidate,
  });
}

export function useSetStaffPermissions(
  kitchen: ReadyKitchen,
): UseMutationResult<
  StaffMember,
  Error,
  { staffId: number; granted: readonly Permission[] }
> {
  const invalidate = useInvalidateRoster(kitchen);
  return useMutation({
    mutationFn: ({
      staffId,
      granted,
    }: {
      staffId: number;
      granted: readonly Permission[];
    }) => services.staff.setPermissions(staffId, granted),
    onSuccess: invalidate,
  });
}

export function useResetStaffAccess(
  kitchen: ReadyKitchen,
): UseMutationResult<{ readonly email: string }, Error, number> {
  const invalidate = useInvalidateRoster(kitchen);
  return useMutation({
    mutationFn: (staffId: number) => services.staff.resetAccess(staffId),
    onSuccess: invalidate,
  });
}

export function useRemoveStaff(
  kitchen: ReadyKitchen,
): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateRoster(kitchen);
  return useMutation({
    mutationFn: (staffId: number) => services.staff.remove(staffId),
    onSuccess: invalidate,
  });
}
