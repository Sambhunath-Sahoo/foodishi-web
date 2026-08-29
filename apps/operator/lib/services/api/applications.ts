/**
 * The application queue against the live API.
 *
 * Every call is platform-scoped: `/admin/restaurant-applications` sits behind
 * `require_platform_role()` on the router, so a restaurant admin holding a
 * perfectly good token cannot read this queue, let alone answer it. That is the
 * one thing worth knowing here — unlike ./catalog.ts, none of these reads work
 * without an operator's session.
 *
 * Both decisions are POSTs and not a PATCH on the row, which mirrors what they
 * do: approval writes three tables. A client that could PATCH a status field
 * could mark an application approved without any of it happening.
 */
import { api } from "@repo/api-client";
import type { Page, RestaurantApplicationRow } from "../../api-types";
import type { ApplicationsService } from "../types";

const BASE = "/admin/restaurant-applications";

export const apiApplications: ApplicationsService = {
  listApplications({ status, limit, offset }) {
    return api.get<Page<RestaurantApplicationRow>>(BASE, {
      query: {
        limit,
        offset,
        // Omitted entirely rather than sent as null: the server's default is
        // every state, and `status=null` on the query string is a 422.
        ...(status === null ? {} : { status }),
      },
    });
  },

  approveApplication(applicationId, note) {
    return api.post<RestaurantApplicationRow>(`${BASE}/${applicationId}/approve`, {
      note,
    });
  },

  rejectApplication(applicationId, reason) {
    return api.post<RestaurantApplicationRow>(`${BASE}/${applicationId}/reject`, {
      reason,
    });
  },
};
