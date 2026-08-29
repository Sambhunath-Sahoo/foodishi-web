/**
 * The fixture source refuses writes it should refuse.
 *
 * A source that let every write through would make this console *look* right
 * and be wrong: a staff member whose Cancel button was merely hidden would
 * succeed the moment a layout changed, and nobody would find out until the
 * server was behind it. So the fixtures check the signed-in person's
 * permissions before they change anything, and throw the refusal a real API
 * would send — same status, same shape, same words on screen.
 *
 * This does NOT make the fixtures secure. Nothing running in a browser is. It
 * makes them *honest*, which is what a stand-in owes the thing it stands in for.
 */
import { PERMISSION_LABELS } from "../../permissions";
import type { Permission } from "../../types";
import { ForbiddenError, NotFoundError } from "./latency";
import { permissionsFor } from "./identity";
import { findRestaurant } from "./store";

/**
 * Throws unless the signed-in person holds `permission` at this restaurant.
 *
 * The message names the restaurant and the permission in the same words the
 * roster uses, because the person reading it is usually the one who needs to
 * ask a manager for it.
 */
export function requirePermission(
  restaurantId: number,
  permission: Permission,
): void {
  if (permissionsFor(restaurantId).has(permission)) return;
  const restaurant = findRestaurant(restaurantId);
  const where = restaurant === null ? `restaurant ${restaurantId}` : restaurant.name;
  throw new ForbiddenError(
    `You do not have permission to ${PERMISSION_LABELS[permission].toLowerCase()} at ${where}. Ask a manager there to grant it.`,
  );
}

/** The row, or the 404 the API would send. Never a silent null downstream. */
export function requireFound<T>(row: T | null, what: string): T {
  if (row === null) throw new NotFoundError(`${what} could not be found.`);
  return row;
}
