/**
 * The menu: categories, dishes, and the add-on and variant groups attached to
 * them.
 *
 * Two refusals here are the important ones, and both exist in the real API:
 *  - a dish that has ever been ordered cannot be deleted, because order_items
 *    keeps the link and a past receipt has to keep naming what was eaten;
 *  - a category that still holds dishes cannot be deleted either, because the
 *    dishes would have nowhere to live.
 * Both name the alternative in the refusal, so the screen shows the way out
 * rather than inventing one.
 */
import type {
  MenuCategory,
  MenuItem,
  MenuItemCreate,
  MenuItemPatch,
  ModifierGroup,
  ModifierOption,
} from "../../types";
import type {
  AvailabilityChange,
  CategoryInput,
  CategoryRename,
  MenuService,
  ModifierGroupInput,
  ModifierOptionInput,
} from "../types";
import { omit } from "../../omit";
import { ConflictError, UnprocessableError, settle } from "./latency";
import { requireFound, requirePermission } from "./guard";
import {
  allMenuItems,
  allModifierGroups,
  allOrders,
  deleteCategory,
  deleteMenuItem,
  deleteModifierGroup,
  findCategory,
  findMenuItem,
  findModifierGroup,
  menuFor,
  takeId,
  writeCategory,
  writeMenuItem,
  writeModifierGroup,
} from "./store";

const NAME_MIN = 2;

function requireName(name: string, what: string): string {
  const trimmed = name.trim();
  if (trimmed.length < NAME_MIN) {
    throw new UnprocessableError(`A ${what} needs at least ${NAME_MIN} characters.`);
  }
  return trimmed;
}

/** How many past orders name this dish. Zero is the only deletable answer. */
function timesOrdered(itemId: number): number {
  return allOrders().filter((order) =>
    order.items.some((line) => line.menu_item_id === itemId),
  ).length;
}

/** Money arrives as a string or a number and is stored as a decimal string. */
function toAmount(value: string | number, what: string): string {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new UnprocessableError(`${what} has to be a number, and not a negative one.`);
  }
  return parsed.toFixed(2);
}

function nextSortOrder(restaurantId: number): number {
  const existing = menuFor(restaurantId);
  return existing.length === 0
    ? 1
    : Math.max(...existing.map((category) => category.sort_order)) + 1;
}

export const fixtureMenu: MenuService = {
  getMenu(restaurantId) {
    requirePermission(restaurantId, "menu.view");
    return settle(menuFor(restaurantId));
  },

  createCategory({ restaurantId, name }: CategoryInput) {
    requirePermission(restaurantId, "menu.categories");
    const clean = requireName(name, "category name");
    if (menuFor(restaurantId).some((row) => row.name.toLowerCase() === clean.toLowerCase())) {
      throw new ConflictError(`This menu already has a category called ${clean}.`);
    }
    const category: MenuCategory = {
      id: takeId("category"),
      restaurant_id: restaurantId,
      name: clean,
      sort_order: nextSortOrder(restaurantId),
      items: [],
    };
    writeCategory(omit(category, "items"));
    return settle(category);
  },

  renameCategory({ categoryId, name }: CategoryRename) {
    const existing = requireFound(findCategory(categoryId), "That category");
    requirePermission(existing.restaurant_id, "menu.categories");
    const renamed = { ...existing, name: requireName(name, "category name") };
    writeCategory(renamed);
    return settle({
      ...renamed,
      items: allMenuItems().filter((item) => item.category_id === categoryId),
    });
  },

  async deleteCategory(categoryId) {
    const existing = requireFound(findCategory(categoryId), "That category");
    requirePermission(existing.restaurant_id, "menu.categories");
    const held = allMenuItems().filter((item) => item.category_id === categoryId);
    if (held.length > 0) {
      throw new ConflictError(
        `${existing.name} still holds ${held.length} ${held.length === 1 ? "dish" : "dishes"}. Move them to another category first — deleting this one would leave them with nowhere to sit.`,
      );
    }
    deleteCategory(categoryId);
    await settle(null);
  },

  createItem(body: MenuItemCreate) {
    requirePermission(body.restaurant_id, "menu.edit");
    const category = requireFound(findCategory(body.category_id), "That category");
    if (category.restaurant_id !== body.restaurant_id) {
      throw new UnprocessableError(
        "That category belongs to a different restaurant.",
      );
    }
    const item: MenuItem = {
      id: takeId("item"),
      restaurant_id: body.restaurant_id,
      category_id: body.category_id,
      name: requireName(body.name, "dish name"),
      description: body.description ?? null,
      price: toAmount(body.price, "A price"),
      is_veg: body.is_veg,
      spice_level: body.spice_level,
      serves: body.serves,
      calories: body.calories ?? null,
      is_available: body.is_available,
      image_url: null,
    };
    writeMenuItem(item);
    return settle(item);
  },

  updateItem(itemId, patch: MenuItemPatch) {
    const existing = requireFound(findMenuItem(itemId), "That dish");
    requirePermission(existing.restaurant_id, "menu.edit");
    const updated: MenuItem = {
      ...existing,
      ...(patch.category_id != null ? { category_id: patch.category_id } : {}),
      ...(patch.name != null ? { name: requireName(patch.name, "dish name") } : {}),
      ...(patch.price != null ? { price: toAmount(patch.price, "A price") } : {}),
      ...(patch.is_veg != null ? { is_veg: patch.is_veg } : {}),
      ...(patch.spice_level != null ? { spice_level: patch.spice_level } : {}),
      ...(patch.serves != null ? { serves: patch.serves } : {}),
      // Both nullable columns take null on purpose: "no calorie count" and
      // "zero calories" are different answers, and so are no description and
      // an empty one.
      ...("calories" in patch ? { calories: patch.calories ?? null } : {}),
      ...("description" in patch ? { description: patch.description ?? null } : {}),
      ...(patch.is_available != null ? { is_available: patch.is_available } : {}),
    };
    writeMenuItem(updated);
    return settle(updated);
  },

  setAvailability({ itemId, isAvailable }: AvailabilityChange) {
    const existing = requireFound(findMenuItem(itemId), "That dish");
    // Its own permission, and the one a shift worker holds by default: a dish
    // that ran out at eight in the evening is service work, not a menu edit.
    requirePermission(existing.restaurant_id, "menu.availability");
    const updated = { ...existing, is_available: isAvailable };
    writeMenuItem(updated);
    return settle(updated);
  },

  async deleteItem(itemId) {
    const existing = requireFound(findMenuItem(itemId), "That dish");
    requirePermission(existing.restaurant_id, "menu.delete");
    const orders = timesOrdered(itemId);
    if (orders > 0) {
      throw new ConflictError(
        `${existing.name} has been ordered ${orders} ${orders === 1 ? "time" : "times"} and cannot be deleted — those receipts keep their link to it. Mark it sold out instead and it leaves the menu straight away.`,
      );
    }
    deleteMenuItem(itemId);
    await settle(null);
  },

  listModifierGroups(restaurantId) {
    requirePermission(restaurantId, "menu.view");
    return settle(
      allModifierGroups()
        .filter((group) => group.restaurant_id === restaurantId)
        .sort((left, right) => left.sort_order - right.sort_order),
    );
  },

  createModifierGroup(input: ModifierGroupInput) {
    requirePermission(input.restaurantId, "menu.modifiers");
    const group: ModifierGroup = {
      id: takeId("group"),
      restaurant_id: input.restaurantId,
      name: requireName(input.name, "group name"),
      kind: input.kind,
      // A variant group is exactly one choice by definition — a half plate is
      // not also a full one — so the bounds are not the caller's to set.
      min_select: input.kind === "variant" ? 1 : Math.max(0, input.minSelect),
      max_select: input.kind === "variant" ? 1 : Math.max(1, input.maxSelect),
      sort_order:
        allModifierGroups().filter((row) => row.restaurant_id === input.restaurantId)
          .length + 1,
      options: [],
      menu_item_ids: input.menuItemIds,
    };
    writeModifierGroup(group);
    return settle(group);
  },

  updateModifierGroup(groupId, patch) {
    const existing = requireFound(findModifierGroup(groupId), "That group");
    requirePermission(existing.restaurant_id, "menu.modifiers");
    const kind = patch.kind ?? existing.kind;
    const updated: ModifierGroup = {
      ...existing,
      kind,
      ...(patch.name != null ? { name: requireName(patch.name, "group name") } : {}),
      ...(patch.menuItemIds != null ? { menu_item_ids: patch.menuItemIds } : {}),
      min_select:
        kind === "variant" ? 1 : Math.max(0, patch.minSelect ?? existing.min_select),
      max_select:
        kind === "variant" ? 1 : Math.max(1, patch.maxSelect ?? existing.max_select),
    };
    if (updated.max_select < updated.min_select) {
      throw new UnprocessableError(
        "A group cannot require more choices than it allows.",
      );
    }
    writeModifierGroup(updated);
    return settle(updated);
  },

  async deleteModifierGroup(groupId) {
    const existing = requireFound(findModifierGroup(groupId), "That group");
    requirePermission(existing.restaurant_id, "menu.modifiers");
    deleteModifierGroup(groupId);
    await settle(null);
  },

  addModifierOption({ groupId, name, priceDelta }: ModifierOptionInput) {
    const group = requireFound(findModifierGroup(groupId), "That group");
    requirePermission(group.restaurant_id, "menu.modifiers");
    const option: ModifierOption = {
      id: takeId("option"),
      group_id: groupId,
      name: requireName(name, "choice name"),
      price_delta: toAmount(priceDelta, "A price"),
      is_available: true,
      sort_order: group.options.length + 1,
    };
    writeModifierGroup({ ...group, options: [...group.options, option] });
    return settle(option);
  },

  updateModifierOption(optionId, patch) {
    const group = requireFound(
      allModifierGroups().find((row) =>
        row.options.some((option) => option.id === optionId),
      ) ?? null,
      "That choice",
    );
    requirePermission(group.restaurant_id, "menu.modifiers");
    const existing = group.options.find((option) => option.id === optionId);
    const updated: ModifierOption = {
      ...requireFound(existing ?? null, "That choice"),
      ...patch,
      ...(patch.price_delta != null
        ? { price_delta: toAmount(patch.price_delta, "A price") }
        : {}),
      ...(patch.name != null ? { name: requireName(patch.name, "choice name") } : {}),
    };
    writeModifierGroup({
      ...group,
      options: group.options.map((option) =>
        option.id === optionId ? updated : option,
      ),
    });
    return settle(updated);
  },

  async removeModifierOption(optionId) {
    const group = requireFound(
      allModifierGroups().find((row) =>
        row.options.some((option) => option.id === optionId),
      ) ?? null,
      "That choice",
    );
    requirePermission(group.restaurant_id, "menu.modifiers");
    if (group.kind === "variant" && group.options.length <= 2) {
      throw new ConflictError(
        `${group.name} is a either/or choice and needs at least two options. Delete the whole group instead.`,
      );
    }
    writeModifierGroup({
      ...group,
      options: group.options.filter((option) => option.id !== optionId),
    });
    await settle(null);
  },
};
