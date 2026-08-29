/**
 * The roster against the live API.
 *
 * Two translations happen here and nowhere else:
 *
 *  - `admin` on the wire is Manager on screen (`fromApiRole` / `toApiRole`).
 *  - The API's membership row has no per-person permissions, so `granted` comes
 *    back empty. A staff member on the live API is therefore exactly as capable
 *    as their role and never accidentally more — the safe direction for a model
 *    the server does not know about yet.
 *
 * `setPermissions` and `resetAccess` are real routes now. The one thing to know
 * about the second: it stamps the reset and echoes the address, and its
 * `sessions_revoked` comes back false because no auth provider is wired up to
 * end anybody's sessions. The roster screen must not claim otherwise.
 */
import { api } from "@repo/api-client";
import type { components } from "@repo/api-client";
import type { Page, StaffMember, StaffRole } from "../../types";
import type { StaffInvite, StaffService } from "../types";
import { fromApiRole, toApiRole } from "./identity";

type WireRoster = components["schemas"]["Page_StaffMemberRead_"];
type WireMember = components["schemas"]["StaffMemberRead"];
type WireMembership = components["schemas"]["StaffRead"];

/** Enough for a roster of any size a single restaurant actually has. */
const PAGE_SIZE = 100;

function toMember(row: WireMember): StaffMember {
  return {
    id: row.id,
    user_id: row.user_id,
    restaurant_id: row.restaurant_id,
    role: fromApiRole(row.role),
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      phone: row.user.phone,
      avatar_url: row.user.avatar_url ?? null,
    },
    granted: [],
  };
}

/**
 * The write routes answer the membership alone, without the person on it. This
 * interface promises a whole roster row, so the write is followed by a read of
 * the restaurant's roster and the matching row is returned — one extra request
 * rather than a row with an invented user on it.
 */
async function readBack(row: WireMembership): Promise<StaffMember> {
  const roster = await api.get<WireRoster>(
    `/restaurants/${row.restaurant_id}/staff`,
    { query: { limit: PAGE_SIZE, offset: 0 } },
  );
  const found = roster.items.find((member) => member.id === row.id);
  return found === undefined
    ? {
        id: row.id,
        user_id: row.user_id,
        restaurant_id: row.restaurant_id,
        role: fromApiRole(row.role),
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user: { id: row.user_id, name: "", email: "", phone: "", avatar_url: null },
        granted: [],
      }
    : toMember(found);
}

export const apiStaff: StaffService = {
  async list(restaurantId, signal) {
    // Revoked members included: the point of is_active over a delete is that a
    // manager can still see who once had access.
    const roster = await api.get<WireRoster>(`/restaurants/${restaurantId}/staff`, {
      signal,
      query: { limit: PAGE_SIZE, offset: 0 },
    });
    const page: Page<StaffMember> = {
      items: roster.items.map(toMember),
      total: roster.total,
      limit: roster.limit,
      offset: roster.offset,
    };
    return page;
  },

  async add({ restaurantId, email, role }: StaffInvite) {
    // Addressed by email because that is the only handle a manager holds — a
    // restaurant manager cannot read the user directory, so there is no picker
    // to offer. Every refusal here is written for a human and shown verbatim.
    const row = await api.post<WireMembership>(`/restaurants/${restaurantId}/staff`, {
      email,
      role: toApiRole(role),
    });
    return readBack(row);
  },

  async setRole(staffId, role: StaffRole) {
    const row = await api.patch<WireMembership>(`/staff/${staffId}`, {
      role: toApiRole(role),
    });
    return readBack(row);
  },

  async setActive(staffId, isActive) {
    const row = await api.patch<WireMembership>(`/staff/${staffId}`, {
      is_active: isActive,
    });
    return readBack(row);
  },

  async setPermissions(staffId, granted) {
    // The whole list, replaced — an unticked box has to be a real removal, and
    // the server refuses anything outside its own grantable set rather than
    // silently filtering it, so a bad tick comes back as a readable 422.
    const row = await api.patch<WireMembership>(`/staff/${staffId}/permissions`, {
      granted,
    });
    return readBack(row);
  },

  async resetAccess(staffId) {
    // The response carries `sessions_revoked`, which is FALSE today: the server
    // stamps the reset and echoes the address, and no auth provider is wired up
    // to end the sessions. The roster screen must not claim otherwise — see the
    // route's docstring in app/routers/staff.py.
    const result = await api.post<{
      readonly email: string;
      readonly sessions_revoked: boolean;
    }>(`/staff/${staffId}/reset-access`);
    return { email: result.email };
  },

  async remove(staffId) {
    await api.delete<null>(`/staff/${staffId}`);
  },
};
