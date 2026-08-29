/**
 * Applying to join, without a backend.
 *
 * This one has to work on the fixture source rather than refuse like `offers`
 * and `reports` do, and for a specific reason: the screen it feeds is the FIRST
 * screen a new restaurateur ever sees, and a first screen that cannot be
 * reviewed without the API up is a first screen nobody reviews.
 *
 * So the refusals are real. The same three the server sends — one open
 * application per account, a web address that is already taken, a session that
 * has ended — are checked here, in the same words, because an applicant meeting
 * them for the first time against the live API would otherwise meet them for
 * the first time in production.
 */
import type { ApplicationSubmit, RestaurantApplication } from "../../types";
import type { ApplicationsService } from "../types";
import { requireSignedIn } from "./identity";
import { ConflictError, settle } from "./latency";
import {
  applicationsFor,
  isSlugTaken,
  takeId,
  writeApplication,
  type StoredApplication,
} from "./store";

function nowIso(): string {
  return new Date().toISOString();
}

export const fixtureApplications: ApplicationsService = {
  listMine() {
    const userId = requireSignedIn();
    return settle(applicationsFor(userId));
  },

  async submit(details: ApplicationSubmit) {
    const userId = requireSignedIn();

    // Same order the API checks in, so the message an applicant meets first is
    // the same one either way: the address they cannot change later before the
    // queue they cannot see.
    const slug = details.slug.trim().toLowerCase();
    if (isSlugTaken(slug)) {
      throw new ConflictError(
        `A restaurant already trades under '${slug}' on Foodishi — choose a different web address`,
      );
    }
    if (applicationsFor(userId).some((row) => row.status === "pending")) {
      throw new ConflictError(
        "You already have an application waiting for review. Foodishi will answer that one before you can send another.",
      );
    }

    const at = nowIso();
    const application: StoredApplication = {
      id: takeId("application"),
      applicant_user_id: userId,
      status: "pending",
      name: details.name,
      slug,
      description: details.description ?? null,
      city: details.city,
      area: details.area,
      address_line: details.address_line,
      latitude: details.latitude,
      longitude: details.longitude,
      phone: details.phone,
      price_for_two: details.price_for_two,
      avg_prep_minutes: details.avg_prep_minutes,
      opens_at: details.opens_at,
      closes_at: details.closes_at,
      note: details.note ?? null,
      // Nothing here decides anything. There is no operator on this source, so
      // an application submitted to the fixtures stays pending forever — which
      // is the honest drawing of a queue nobody is working.
      decision_note: null,
      reviewed_at: null,
      restaurant_id: null,
      created_at: at,
      updated_at: at,
    };
    writeApplication(application);
    return settle<RestaurantApplication>(application);
  },
};
