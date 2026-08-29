/**
 * Applying to join, against the real routes.
 *
 * Thin on purpose. Both calls are one request with no translation: the console's
 * `RestaurantApplication` is the API's `ApplicationRead` field for field, which
 * is why `lib/types.ts` says to replace the hand-written declaration with the
 * generated alias once `pnpm --filter @repo/api-client gen` has been run against
 * an API carrying these routes.
 *
 * Neither call takes an applicant. The API reads that from the bearer token —
 * an argument naming somebody else would be a way to apply in their name.
 */
import { api } from "@repo/api-client";
import type { RestaurantApplication } from "../../types";
import type { ApplicationsService } from "../types";

export const apiApplications: ApplicationsService = {
  listMine(signal) {
    return api.get<readonly RestaurantApplication[]>(
      "/restaurant-applications/mine",
      { signal },
    );
  },

  submit(details) {
    // Refusals pass straight through: a 409 here says either "you already have
    // one waiting" or "that web address is taken", and both are sentences the
    // applicant has to read to know what to do next.
    return api.post<RestaurantApplication>("/restaurant-applications", details);
  },
};
