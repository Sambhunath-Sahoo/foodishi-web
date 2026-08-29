/**
 * The menu against the live API.
 *
 * Every method here has a real route, add-on and variant groups included.
 *
 * One asymmetry worth knowing: the group reads below are the RESTAURANT's view
 * and are admin-gated, while the customer app reads
 * GET /menu-items/{id}/modifier-groups, which is public. Two routes rather than
 * one because the audiences differ — a manager needs to see which dishes a
 * group is on, and a customer needs to see the group at all without a token.
 */
import { api } from "@repo/api-client";
import type {
  MenuCategory,
  MenuItem,
  ModifierGroup,
  ModifierOption,
} from "../../types";
import type {
  AvailabilityChange,
  CategoryInput,
  CategoryRename,
  MenuService,
} from "../types";
export const apiMenu: MenuService = {
  getMenu(restaurantId, signal) {
    return api.get<readonly MenuCategory[]>(`/restaurants/${restaurantId}/menu`, {
      signal,
    });
  },

  createCategory({ restaurantId, name }: CategoryInput) {
    // sort_order is left to the server's default: sending a guess would fight
    // whatever ordering the operator console has already set.
    return api.post<MenuCategory>(`/restaurants/${restaurantId}/menu-categories`, {
      name,
    });
  },

  renameCategory({ categoryId, name }: CategoryRename) {
    return api.patch<MenuCategory>(`/menu-categories/${categoryId}`, { name });
  },

  async deleteCategory(categoryId) {
    await api.delete<null>(`/menu-categories/${categoryId}`);
  },

  createItem(body) {
    // restaurant_id travels in the body on this one route, so the caller spells
    // it out; the server checks it against the caller's own manager row first.
    return api.post<MenuItem>("/menu-items", body);
  },

  updateItem(itemId, patch) {
    return api.patch<MenuItem>(`/menu-items/${itemId}`, patch);
  },

  setAvailability({ itemId, isAvailable }: AvailabilityChange) {
    return api.patch<MenuItem>(`/menu-items/${itemId}`, { is_available: isAvailable });
  },

  async deleteItem(itemId) {
    // Fails with a 409 for any dish that has ever been ordered, and the
    // server's own words name the alternative — so they go through verbatim.
    await api.delete<null>(`/menu-items/${itemId}`);
  },

  listModifierGroups(restaurantId, signal) {
    // The management view: every group the restaurant has, each carrying the
    // dishes it is attached to. There is also a PUBLIC per-dish read at
    // GET /menu-items/{id}/modifier-groups — that one is what the customer app
    // calls, and it is unauthenticated on purpose, because a variant nobody can
    // read is a variant nobody can order.
    return api.get<readonly ModifierGroup[]>(
      `/restaurants/${restaurantId}/modifier-groups`,
      { signal },
    );
  },

  createModifierGroup(input) {
    return api.post<ModifierGroup>(
      `/restaurants/${input.restaurantId}/modifier-groups`,
      {
        name: input.name,
        kind: input.kind,
        min_select: input.minSelect,
        max_select: input.maxSelect,
        menu_item_ids: input.menuItemIds,
      },
    );
  },

  updateModifierGroup(groupId, patch) {
    // Only what changed. `menu_item_ids` is a WHOLESALE replacement server-side,
    // so omitting it leaves attachments alone and sending [] detaches every
    // dish — which is the only way a caller can express a detachment at all.
    return api.patch<ModifierGroup>(`/modifier-groups/${groupId}`, {
      ...(patch.name === undefined ? {} : { name: patch.name }),
      ...(patch.kind === undefined ? {} : { kind: patch.kind }),
      ...(patch.minSelect === undefined ? {} : { min_select: patch.minSelect }),
      ...(patch.maxSelect === undefined ? {} : { max_select: patch.maxSelect }),
      ...(patch.menuItemIds === undefined
        ? {}
        : { menu_item_ids: patch.menuItemIds }),
    });
  },

  async deleteModifierGroup(groupId) {
    await api.delete<null>(`/modifier-groups/${groupId}`);
  },

  addModifierOption(input) {
    return api.post<ModifierOption>(`/modifier-groups/${input.groupId}/options`, {
      name: input.name,
      price_delta: input.priceDelta,
    });
  },

  updateModifierOption(optionId, patch) {
    return api.patch<ModifierOption>(`/modifier-options/${optionId}`, patch);
  },

  async removeModifierOption(optionId) {
    // 409 for the second-to-last option of a pick-one group: an either/or with
    // one answer is not a choice. The server names the two ways out and the
    // dialog shows its words.
    await api.delete<null>(`/modifier-options/${optionId}`);
  },
};
