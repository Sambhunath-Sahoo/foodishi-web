/**
 * The seeded accounts, described well enough to sign in as.
 *
 * This exists for the sign-in screen's sample list, and it is the only thing in
 * the app that reads one account's password. That is defensible for exactly as
 * long as the passwords are seed data: `isFixtureSource` and a
 * `NODE_ENV !== "production"` check gate every use, and there is no API
 * equivalent — those are real credentials and no screen has business knowing
 * one.
 *
 * The roles are read from the roster rather than written down here, so editing
 * the seed cannot leave the sign-in hints lying about who is a manager.
 */
import { ROLE_LABELS } from "../../permissions";
import type { StaffRole } from "../../types";
import { allStaff, findRestaurant, listAccounts } from "./store";

export interface SampleAccount {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly password: string;
  /** Manager first, and one entry per distinct role held anywhere. */
  readonly roleLabels: readonly string[];
  /** "Manager at Tandoori Nights · Staff at Paradise Biryani House" */
  readonly summary: string;
}

export function listSampleAccounts(): readonly SampleAccount[] {
  const roster = allStaff();

  return listAccounts().map((account) => {
    const held = roster.filter((row) => row.user_id === account.id && row.is_active);
    const roles = [...new Set(held.map((row) => row.role))] as readonly StaffRole[];
    const ordered = (["manager", "staff"] as const).filter((role) => roles.includes(role));

    return {
      id: account.id,
      name: account.name,
      email: account.email,
      password: account.password,
      roleLabels: ordered.map((role) => ROLE_LABELS[role]),
      summary:
        held.length === 0
          ? "No restaurant access"
          : held
              .map(
                (row) =>
                  `${ROLE_LABELS[row.role]} at ${findRestaurant(row.restaurant_id)?.name ?? "a restaurant"}`,
              )
              .join(" · "),
    };
  });
}
