"use client";

/**
 * Reading and changing the menu.
 *
 * Every mutation here re-reads the menu before it resolves — returned, not
 * fired and forgotten — so a dialog's button stays busy until the table behind
 * it actually holds what was just saved. A dialog that closed on an
 * un-refreshed list is how a kitchen ends up adding the same dish twice.
 */
import * as React from "react";
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
import type {
  MenuCategory,
  MenuItem,
  MenuItemCreate,
  MenuItemPatch,
  ModifierGroup,
  ModifierOption,
} from "../types";
import type { ModifierGroupInput, ModifierOptionInput } from "../services/types";

function useInvalidateMenu(kitchen: ReadyKitchen): () => Promise<void> {
  const queryClient = useQueryClient();
  const { userId, restaurantId } = kitchen;
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.menu(userId, restaurantId) }),
      // A dish's name and availability show up in the popular-items report too.
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
    ]);
  };
}

function useInvalidateModifiers(kitchen: ReadyKitchen): () => Promise<void> {
  const queryClient = useQueryClient();
  const { userId, restaurantId } = kitchen;
  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.modifiers(userId, restaurantId),
    });
}

export function useMenu(
  kitchen: ReadyKitchen,
  options?: { readonly enabled?: boolean },
): UseQueryResult<readonly MenuCategory[]> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.menu(userId, restaurantId),
    enabled: options?.enabled ?? true,
    queryFn: ({ signal }) => services.menu.getMenu(restaurantKey, signal),
  });
}

/** A dish's face on a ticket: the cover photo, and whether it is veg. */
export interface DishFace {
  readonly imageUrl: string | null;
  readonly isVeg: boolean;
}

/**
 * `menu_item_id` -> the dish's photo, for the lines on an order.
 *
 * Order lines carry an id and a name and never a picture, so the photo on a
 * ticket comes from the menu this kitchen already reads — the same cached query
 * the menu screen uses, so a warm cache makes this free.
 *
 * Gated on `menu.view`: somebody without it gets an empty map and text-only
 * lines, rather than a 403 behind every ticket on the board. An empty map is
 * also what a kitchen that has uploaded no photos yields, and the lines are
 * built to read the same either way.
 */
export function useDishFaces(kitchen: ReadyKitchen): ReadonlyMap<number, DishFace> {
  const menu = useMenu(kitchen, { enabled: kitchen.can("menu.view") });

  return React.useMemo(() => {
    const faces = new Map<number, DishFace>();
    for (const category of menu.data ?? []) {
      for (const item of category.items) {
        if (item.image_url === null || item.image_url === undefined) continue;
        faces.set(item.id, { imageUrl: item.image_url, isVeg: item.is_veg });
      }
    }
    return faces;
  }, [menu.data]);
}

export function useModifierGroups(
  kitchen: ReadyKitchen,
): UseQueryResult<readonly ModifierGroup[]> {
  const { userId, restaurantId, restaurantKey } = kitchen;
  return useQuery({
    queryKey: queryKeys.modifiers(userId, restaurantId),
    // Fixture-only, so a refusal here is a documented gap rather than a fault
    // worth hammering. Asked once.
    retry: false,
    queryFn: ({ signal }) => services.menu.listModifierGroups(restaurantKey, signal),
  });
}

export function useCreateCategory(
  kitchen: ReadyKitchen,
): UseMutationResult<MenuCategory, Error, string> {
  const invalidate = useInvalidateMenu(kitchen);
  return useMutation({
    mutationFn: (name: string) =>
      services.menu.createCategory({ restaurantId: kitchen.restaurantKey, name }),
    onSuccess: invalidate,
  });
}

export function useRenameCategory(
  kitchen: ReadyKitchen,
): UseMutationResult<MenuCategory, Error, { categoryId: number; name: string }> {
  const invalidate = useInvalidateMenu(kitchen);
  return useMutation({
    mutationFn: (input: { categoryId: number; name: string }) =>
      services.menu.renameCategory(input),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory(
  kitchen: ReadyKitchen,
): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateMenu(kitchen);
  return useMutation({
    mutationFn: (categoryId: number) => services.menu.deleteCategory(categoryId),
    onSuccess: invalidate,
  });
}

export function useCreateMenuItem(
  kitchen: ReadyKitchen,
): UseMutationResult<MenuItem, Error, Omit<MenuItemCreate, "restaurant_id">> {
  const invalidate = useInvalidateMenu(kitchen);
  return useMutation({
    mutationFn: (body: Omit<MenuItemCreate, "restaurant_id">) =>
      services.menu.createItem({ ...body, restaurant_id: kitchen.restaurantKey }),
    onSuccess: invalidate,
  });
}

export function useUpdateMenuItem(
  kitchen: ReadyKitchen,
): UseMutationResult<MenuItem, Error, { itemId: number; patch: MenuItemPatch }> {
  const invalidate = useInvalidateMenu(kitchen);
  return useMutation({
    mutationFn: ({ itemId, patch }: { itemId: number; patch: MenuItemPatch }) =>
      services.menu.updateItem(itemId, patch),
    onSuccess: invalidate,
  });
}

export function useSetItemAvailability(
  kitchen: ReadyKitchen,
): UseMutationResult<MenuItem, Error, { itemId: number; isAvailable: boolean }> {
  const invalidate = useInvalidateMenu(kitchen);
  return useMutation({
    mutationFn: (change: { itemId: number; isAvailable: boolean }) =>
      services.menu.setAvailability(change),
    onSuccess: invalidate,
  });
}

export function useDeleteMenuItem(
  kitchen: ReadyKitchen,
): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateMenu(kitchen);
  return useMutation({
    mutationFn: (itemId: number) => services.menu.deleteItem(itemId),
    onSuccess: invalidate,
  });
}

export function useSaveModifierGroup(
  kitchen: ReadyKitchen,
): UseMutationResult<
  ModifierGroup,
  Error,
  { groupId: number | null; input: ModifierGroupInput }
> {
  const invalidate = useInvalidateModifiers(kitchen);
  return useMutation({
    mutationFn: ({
      groupId,
      input,
    }: {
      groupId: number | null;
      input: ModifierGroupInput;
    }) =>
      groupId === null
        ? services.menu.createModifierGroup(input)
        : services.menu.updateModifierGroup(groupId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteModifierGroup(
  kitchen: ReadyKitchen,
): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateModifiers(kitchen);
  return useMutation({
    mutationFn: (groupId: number) => services.menu.deleteModifierGroup(groupId),
    onSuccess: invalidate,
  });
}

export function useAddModifierOption(
  kitchen: ReadyKitchen,
): UseMutationResult<ModifierOption, Error, ModifierOptionInput> {
  const invalidate = useInvalidateModifiers(kitchen);
  return useMutation({
    mutationFn: (input: ModifierOptionInput) => services.menu.addModifierOption(input),
    onSuccess: invalidate,
  });
}

export function useUpdateModifierOption(
  kitchen: ReadyKitchen,
): UseMutationResult<
  ModifierOption,
  Error,
  { optionId: number; patch: Partial<Omit<ModifierOption, "id" | "group_id">> }
> {
  const invalidate = useInvalidateModifiers(kitchen);
  return useMutation({
    mutationFn: ({
      optionId,
      patch,
    }: {
      optionId: number;
      patch: Partial<Omit<ModifierOption, "id" | "group_id">>;
    }) => services.menu.updateModifierOption(optionId, patch),
    onSuccess: invalidate,
  });
}

export function useRemoveModifierOption(
  kitchen: ReadyKitchen,
): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateModifiers(kitchen);
  return useMutation({
    mutationFn: (optionId: number) => services.menu.removeModifierOption(optionId),
    onSuccess: invalidate,
  });
}
