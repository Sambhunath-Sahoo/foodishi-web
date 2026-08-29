/**
 * The roster: who works here, what they may do, and how their access is taken
 * away.
 *
 * Three refusals carry the rules that matter, and all three are the server's in
 * the finished product:
 *
 *  - A restaurant may never lose its last active manager. Without that, one tap
 *    locks everybody out of the menu, the money and this very screen.
 *  - Nobody may revoke, demote or remove themselves. Same reason, one step less
 *    obvious.
 *  - A staff member may only be granted permissions from a short, deliberate
 *    list. Anything else is dropped rather than stored, so a hand-edited grant
 *    list cannot hand somebody the payouts screen.
 */
import { GRANTABLE_PERMISSIONS, ROLE_LABELS } from "../../permissions";
import type { Page, Permission, StaffMember, StaffRole } from "../../types";
import type { StaffInvite, StaffService } from "../types";
import { ConflictError, UnprocessableError, settle } from "./latency";
import { requireFound, requirePermission } from "./guard";
import { requireSignedIn } from "./identity";
import {
  deleteStaff,
  findAccountByEmail,
  findRestaurant,
  findStaff,
  staffFor,
  takeId,
  writeStaff,
} from "./store";

const GRANTABLE: ReadonlySet<Permission> = new Set(GRANTABLE_PERMISSIONS);

function now(): string {
  return new Date().toISOString();
}

/**
 * Refuses any change that would leave this restaurant with no active manager.
 *
 * Called before the write, with the row as it *would* be, so the check is on
 * the outcome rather than on the intent.
 */
function requireAManagerRemains(next: StaffMember, what: string): void {
  const others = staffFor(next.restaurant_id).filter((row) => row.id !== next.id);
  const willHaveManager =
    (next.is_active && next.role === "manager") ||
    others.some((row) => row.is_active && row.role === "manager");
  if (willHaveManager) return;
  const restaurant = findRestaurant(next.restaurant_id);
  throw new ConflictError(
    `${restaurant?.name ?? "This restaurant"} would be left with no active manager, and nobody could reach the menu, the money or this screen. Appoint another manager first, then ${what}.`,
  );
}

/** Nobody edits their own access. It is the same lockout, one step subtler. */
function requireNotSelf(row: StaffMember, what: string): void {
  if (row.user_id !== requireSignedIn()) return;
  throw new ConflictError(
    `You cannot ${what} your own access. Ask another manager here to do it.`,
  );
}

export const fixtureStaff: StaffService = {
  list(restaurantId) {
    requirePermission(restaurantId, "staff.view");
    const rows = [...staffFor(restaurantId)];
    const page: Page<StaffMember> = {
      items: rows,
      total: rows.length,
      limit: rows.length,
      offset: 0,
    };
    return settle(page);
  },

  add({ restaurantId, email, role }: StaffInvite) {
    requirePermission(restaurantId, "staff.manage");
    const account = findAccountByEmail(email);
    // The email is the only handle a manager holds — there is no user directory
    // to search — so an address the platform does not know is the one refusal
    // that has to name itself clearly.
    if (account === null) {
      throw new UnprocessableError(
        `No Foodishi account uses ${email.trim()}. They have to sign up first — this grants access to an account that already exists, it is not an invitation.`,
      );
    }
    const existing = staffFor(restaurantId).find((row) => row.user_id === account.id);
    if (existing !== undefined) {
      throw new ConflictError(
        existing.is_active
          ? `${account.name} already works here as ${ROLE_LABELS[existing.role].toLowerCase()}.`
          : `${account.name} is already on this roster with their access revoked. Restore it instead of adding them again.`,
      );
    }
    const row: StaffMember = {
      id: takeId("staff"),
      user_id: account.id,
      restaurant_id: restaurantId,
      role,
      is_active: true,
      created_at: now(),
      updated_at: now(),
      user: {
        id: account.id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        avatar_url: account.avatar_url ?? null,
      },
      granted: [],
    };
    writeStaff(row);
    return settle(row);
  },

  setRole(staffId, role: StaffRole) {
    const existing = requireFound(findStaff(staffId), "That membership");
    requirePermission(existing.restaurant_id, "staff.manage");
    requireNotSelf(existing, "change the role on");
    // Demoting a manager drops their grants to nothing rather than carrying a
    // manager's implied everything into a staff row.
    const next: StaffMember = {
      ...existing,
      role,
      granted: role === "manager" ? [] : existing.granted,
      updated_at: now(),
    };
    requireAManagerRemains(next, "change this role");
    writeStaff(next);
    return settle(next);
  },

  setActive(staffId, isActive) {
    const existing = requireFound(findStaff(staffId), "That membership");
    requirePermission(existing.restaurant_id, "staff.manage");
    requireNotSelf(existing, isActive ? "restore" : "revoke");
    const next: StaffMember = { ...existing, is_active: isActive, updated_at: now() };
    requireAManagerRemains(next, isActive ? "restore this access" : "revoke this access");
    writeStaff(next);
    return settle(next);
  },

  setPermissions(staffId, granted: readonly Permission[]) {
    const existing = requireFound(findStaff(staffId), "That membership");
    requirePermission(existing.restaurant_id, "staff.manage");
    if (existing.role === "manager") {
      throw new UnprocessableError(
        "A manager already holds every permission — there is nothing left to grant. Make them staff first if their access should be narrower.",
      );
    }
    const rejected = granted.filter((permission) => !GRANTABLE.has(permission));
    if (rejected.length > 0) {
      throw new UnprocessableError(
        `These are not permissions a staff member can hold: ${rejected.join(", ")}. Only the two order refusals can be granted; everything else is a manager's.`,
      );
    }
    // Deduplicated, and the whole list is replaced — an unticked box is a real
    // removal, not an absence the store might keep from last time.
    const next: StaffMember = {
      ...existing,
      granted: [...new Set(granted)],
      updated_at: now(),
    };
    writeStaff(next);
    return settle(next);
  },

  resetAccess(staffId) {
    const existing = requireFound(findStaff(staffId), "That membership");
    requirePermission(existing.restaurant_id, "staff.manage");
    if (!existing.is_active) {
      throw new ConflictError(
        `${existing.user.name}'s access here is revoked, so there is nothing to reset. Restore it first.`,
      );
    }
    // No password is set, shown or mailed from here. The real route sends a
    // one-time link and signs their other sessions out; the fixture reports the
    // address it would have gone to, which is the only thing a manager standing
    // at a tablet can act on.
    return settle({ email: existing.user.email });
  },

  async remove(staffId) {
    const existing = requireFound(findStaff(staffId), "That membership");
    requirePermission(existing.restaurant_id, "staff.manage");
    requireNotSelf(existing, "remove");
    requireAManagerRemains(
      { ...existing, is_active: false },
      "remove this person",
    );
    deleteStaff(staffId);
    await settle(null);
  },
};
