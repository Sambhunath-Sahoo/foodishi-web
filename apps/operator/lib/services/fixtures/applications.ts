import type { RestaurantApplicationRow, RestaurantDetail } from "../../api-types";
import type { ApplicationsService } from "../types";
import { ConflictError, NotFoundError, settle, settleWrite, UnprocessableError } from "./latency";
import { toPage } from "./paging";
import { allApplications, addRestaurant, findApplication, patchApplication } from "./store";

/**
 * The queue of restaurants asking to join, and the two answers.
 *
 * The approval here does what the server's does rather than only saying it did:
 * it mints a kitchen in the catalogue, closed, with no menu and no delivery
 * policy behind it. That is the whole reason this is not a status toggle — an
 * operator reviewing this console should be able to approve an application, open
 * Restaurants, and find the new kitchen sitting there switched off, because that
 * is the state a real approval leaves behind and the state its owner then has to
 * finish.
 *
 * What it cannot do is make the applicant an admin of it: there is no
 * membership table in this source, and the partner console's fixtures are a
 * different browser store entirely. Named here rather than left as a silent
 * difference — see the comment on `approveApplication`.
 */

/** The API's own floor for a rejection reason, so the refusal matches. */
const REASON_MIN_LENGTH = 10;

function requireApplication(applicationId: number): RestaurantApplicationRow {
  const application = findApplication(applicationId);
  if (application === null) {
    throw new NotFoundError(
      `No restaurant application with id ${String(applicationId)}.`,
    );
  }
  return application;
}

/**
 * Refuse a second decision on an application that already has one.
 *
 * Not a race to retry: it is two operators working the same list, and the second
 * needs to be told the answer rather than allowed to overwrite it. An approval
 * that ran twice would mint two kitchens from one application.
 */
function requirePending(application: RestaurantApplicationRow): void {
  if (application.status === "pending") return;
  throw new ConflictError(
    `Application ${String(application.id)} was already ${application.status}.`,
  );
}

/**
 * The application as the restaurant it becomes.
 *
 * `is_active: false` is the substance of this, not a default: discovery filters
 * on that column alone, so an approved kitchen is invisible to customers until
 * its owner opens it. `policy: null` and no cuisines are equally deliberate —
 * neither exists yet, and drawing them would hide the two things the new owner
 * still has to do.
 */
function toRestaurant(
  application: RestaurantApplicationRow,
  id: number,
): RestaurantDetail {
  return {
    id,
    name: application.name,
    slug: application.slug,
    description: application.description,
    city: application.city,
    area: application.area,
    address_line: application.address_line,
    latitude: application.latitude,
    longitude: application.longitude,
    phone: application.phone,
    rating: "0.0",
    rating_count: 0,
    price_for_two: application.price_for_two,
    avg_prep_minutes: application.avg_prep_minutes,
    image_url: null,
    opens_at: application.opens_at,
    closes_at: application.closes_at,
    is_active: false,
    cuisines: [],
    policy: null,
  };
}

export const fixtureApplications: ApplicationsService = {
  listApplications(query) {
    const rows = allApplications()
      .filter((row) => query.status === null || row.status === query.status)
      // Oldest first, as the server orders it: this is a worklist, and the
      // application that has waited longest is the one that must be on top.
      // A copy is sorted, never the stored array — .filter already made one.
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
    return settle(toPage(rows, query));
  },

  approveApplication(applicationId, note) {
    const application = requireApplication(applicationId);
    requirePending(application);

    // The server refuses this before writing anything, because approving a
    // deactivated account produces a restaurant with an owner row the API will
    // never honour — and therefore a kitchen nobody can edit.
    if (!application.is_applicant_active) {
      throw new UnprocessableError(
        `${application.applicant_email} is deactivated; reactivate the account before approving their application.`,
      );
    }

    const restaurant = addRestaurant((id) => toRestaurant(application, id));

    // The membership the server also writes has no equivalent here: this source
    // has no roster, and the applicant's own console reads a different store. So
    // the kitchen appears and its owner does not — the one part of this act the
    // fixtures cannot draw.
    const decided: Partial<RestaurantApplicationRow> = {
      status: "approved",
      decision_note: note,
      reviewed_at: new Date().toISOString(),
      restaurant_id: restaurant.id,
    };
    patchApplication(applicationId, decided);
    return settleWrite({ ...application, ...decided });
  },

  rejectApplication(applicationId, reason) {
    const application = requireApplication(applicationId);
    requirePending(application);

    const written = reason.trim();
    if (written.length < REASON_MIN_LENGTH) {
      throw new UnprocessableError(
        `A reason needs at least ${String(REASON_MIN_LENGTH)} characters — the applicant reads it, and a refusal they cannot act on means they send the same application again.`,
      );
    }

    const decided: Partial<RestaurantApplicationRow> = {
      status: "rejected",
      decision_note: written,
      reviewed_at: new Date().toISOString(),
    };
    patchApplication(applicationId, decided);
    return settleWrite({ ...application, ...decided });
  },
};
