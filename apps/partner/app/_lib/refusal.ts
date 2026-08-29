/**
 * A refusal that will never become a success, told apart from a failure worth
 * retrying.
 *
 * Some doors are shut to a kitchen by design — the customer's saved addresses
 * and profile are the customer's, and the API says so with a 403 every single
 * time. Drawing that as a red alarm with a "Try again" button next to it is
 * two lies at once: it reads as something broken, and it offers a tap that can
 * only ever be refused again. DENSITY.md §1's rule about loudness applies to
 * error states too — if the permanent shows as loud as the transient, neither
 * carries information.
 *
 * `ApiError.action` carries most of this decision. The one status code named
 * below is 404, because the API deliberately answers "not found" for a denial
 * that depends on the row -- telling "not yours" from "does not exist" is itself
 * a leak -- so a designed refusal now arrives under either code.
 */
import { isApiError } from "@repo/api-client";

export function isPermanentRefusal(error: unknown): boolean {
  if (!isApiError(error)) return false;
  // A 404 on /me* is the profile-linking gap, which a tap CAN resolve — it must
  // reach the caller as an actionable prompt, never as a quiet note.
  if (error.action === "link-profile") return false;
  // 403 AND 404. The API closes an existence oracle by answering "not found"
  // rather than "not yours" for a row-dependent denial, so the doors that used
  // to say 403 — GET /addresses/{id} and GET /users/{id} for a kitchen — now say
  // 404. Matching only "forbidden" left this returning false for exactly the
  // refusals it was written for: the Delivering-to card then drew the customer
  // half as a quiet note and the address half as a red alert with a live "Try
  // again", about an address the partner was looking at.
  //
  // The definition that survives both wordings is the one that was always meant:
  // retrying cannot change the answer.
  return error.action === "forbidden" || error.status === 404;
}
