/**
 * What a person may do in one restaurant, decided in one place.
 *
 * A role is the shorthand; the permission is the thing actually checked. That
 * split exists because two of the lines in the brief — "reject orders if
 * permitted" and "cancel orders where permitted" — are not role questions. One
 * kitchen trusts its evening staff to turn a ticket away; the next wants every
 * refusal to go through the manager. Both are the same role.
 *
 * So: a role grants a fixed floor, and a manager may hand a staff member extra
 * permissions from a short, deliberate list. Nothing outside that list can be
 * granted at all — a staff member can never be given the payouts screen by
 * accident, however the grants were edited.
 *
 * This is a UI-side model. When these move behind real endpoints the server
 * becomes the authority and every gate here drops to what it already is:
 * COSMETIC. Hiding a control saves a tap that would only be refused; it is not
 * what keeps anything safe.
 */
import type { Permission, StaffRole } from "./types";

/** Every permission the console knows about, in the order screens read them. */
export const ALL_PERMISSIONS: readonly Permission[] = [
  "dashboard.view",
  "orders.view",
  "orders.accept",
  "orders.reject",
  "orders.status",
  "orders.cancel",
  "orders.history",
  "handover.view",
  "handover.mark",
  "menu.view",
  "menu.availability",
  "menu.edit",
  "menu.delete",
  "menu.categories",
  "menu.modifiers",
  "restaurant.view",
  "restaurant.edit",
  "staff.view",
  "staff.manage",
  "offers.view",
  "offers.manage",
  "reports.view",
  "payments.view",
];

/**
 * What a shift worker can do the moment they are added, with nothing granted.
 *
 * Day-to-day service and nothing else: see the queue, take a ticket on, move
 * it through the kitchen, hand it over, and sell a dish out when it runs out.
 * Selling out is in here on purpose — a dish that ran out at eight in the
 * evening is queue work, and routing it through a manager means it stays on
 * the menu until someone answers their phone.
 */
const STAFF_BASE: readonly Permission[] = [
  "dashboard.view",
  "orders.view",
  "orders.accept",
  "orders.status",
  "orders.history",
  "handover.view",
  "handover.mark",
  "menu.view",
  "menu.availability",
];

/**
 * The only permissions a manager may hand to a staff member.
 *
 * Both turn a customer away, which is why they are a decision rather than a
 * default — and why the list is this short. Everything absent from it is a
 * business setting, and the brief is explicit that staff do not change those:
 * the menu itself, the restaurant, the roster, promotions and anything
 * financial are structurally out of reach, not merely unticked.
 */
export const GRANTABLE_PERMISSIONS: readonly Permission[] = [
  "orders.reject",
  "orders.cancel",
];

/** Said once, wherever a permission is shown, so no two screens disagree. */
export const PERMISSION_LABELS: Readonly<Record<Permission, string>> = {
  "dashboard.view": "See the dashboard",
  "orders.view": "See incoming orders",
  "orders.accept": "Accept orders",
  "orders.reject": "Reject orders",
  "orders.status": "Move orders through the kitchen",
  "orders.cancel": "Cancel accepted orders",
  "orders.history": "See past orders",
  "handover.view": "See orders waiting for pickup",
  "handover.mark": "Mark orders handed over and delivered",
  "menu.view": "See the menu",
  "menu.availability": "Mark dishes available or sold out",
  "menu.edit": "Add, edit and price dishes",
  "menu.delete": "Delete dishes",
  "menu.categories": "Create and rename categories",
  "menu.modifiers": "Manage add-ons and variants",
  "restaurant.view": "See the restaurant's settings",
  "restaurant.edit": "Change the restaurant, its hours and prep time",
  "staff.view": "See the team",
  "staff.manage": "Add, remove and manage staff",
  "offers.view": "See offers and coupons",
  "offers.manage": "Create and change offers and coupons",
  "reports.view": "See sales and performance reports",
  "payments.view": "See earnings and settlements",
};

/** One line each, for the row a manager reads before ticking it. */
export const PERMISSION_HINTS: Readonly<Partial<Record<Permission, string>>> = {
  "orders.reject": "Turn a ticket away before the kitchen has accepted it. The customer pays no fee and is told the kitchen refused.",
  "orders.cancel": "Drop a ticket the kitchen already accepted. It breaks a promise the customer has already been given, so most kitchens keep this with the manager.",
};

const MANAGER_SET: ReadonlySet<Permission> = new Set(ALL_PERMISSIONS);
const STAFF_BASE_SET: ReadonlySet<Permission> = new Set(STAFF_BASE);
const GRANTABLE_SET: ReadonlySet<Permission> = new Set(GRANTABLE_PERMISSIONS);

/**
 * Everything this membership may actually do.
 *
 * A manager gets the lot and their grants are ignored — there is nothing left
 * to grant. A staff member gets their floor plus whatever was granted from
 * `GRANTABLE_PERMISSIONS`, and anything else in `granted` is dropped rather
 * than trusted: the stored list is data, and data can be wrong.
 */
export function resolvePermissions(
  role: StaffRole,
  granted: readonly Permission[],
): ReadonlySet<Permission> {
  if (role === "manager") return MANAGER_SET;
  const allowed = granted.filter((permission) => GRANTABLE_SET.has(permission));
  return new Set<Permission>([...STAFF_BASE, ...allowed]);
}

/** True for a permission the role already carries and cannot give up. */
export function isBaseline(role: StaffRole, permission: Permission): boolean {
  return role === "manager" ? true : STAFF_BASE_SET.has(permission);
}

export const ROLE_LABELS: Readonly<Record<StaffRole, string>> = {
  manager: "Manager",
  staff: "Staff",
};

/** Managers first: somebody reading a roster wants to see who can change things. */
export const ROLE_ORDER: readonly StaffRole[] = ["manager", "staff"];

export const ROLE_OPTIONS: readonly {
  readonly value: StaffRole;
  readonly label: string;
}[] = ROLE_ORDER.map((role) => ({ value: role, label: ROLE_LABELS[role] }));

/** Said once, wherever a role is chosen, so the two places cannot drift. */
export const ROLE_HINT =
  "A manager runs the restaurant: the menu, the team, offers, the money and closing for the day. Staff work the order queue and the day's service, and can be granted the two refusals on top.";

export function roleRank(role: string): number {
  const index = ROLE_ORDER.indexOf(role as StaffRole);
  return index === -1 ? ROLE_ORDER.length : index;
}
