"use client";

/**
 * Which restaurant this tablet has open, and what the signed-in person may do
 * in it.
 *
 * Every membership here came from the data source's own answer to "what may
 * this account act for" — the fixtures from their roster, the API from the
 * bearer token's `restaurant_staff` rows. It is not a filtered copy of the
 * public catalogue, so there is nothing to pick that would then be refused: one
 * restaurant is opened silently, several offer a picker, and none is an honest
 * dead end rather than an empty order queue.
 *
 * `can()` is the one gate the whole console asks. Hiding a control with it is
 * COSMETIC — it saves a tap that could only be refused. The refusal itself is
 * the data source's, and both of them do refuse.
 */
import * as React from "react";
import { resolvePermissions } from "./permissions";
import { useSession } from "./session";
import type { Membership, Permission, Profile, StaffRole } from "./types";

/** Remembered per profile, so two people sharing a tablet do not collide. */
const SELECTION_KEY_PREFIX = "foodishi.partner.restaurant.";

export type KitchenStatus =
  | "signed-out"
  | "loading"
  | "error"
  /** Signed in, but staff of nowhere. Nothing to show and nothing to pick. */
  | "no-membership"
  /** Several restaurants, none chosen yet. */
  | "unselected"
  | "ready";

interface KitchenBase {
  readonly status: KitchenStatus;
  readonly userId: string | null;
  readonly restaurantId: string | null;
  readonly restaurants: readonly Membership[];
  readonly error: unknown;
  readonly select: (restaurantId: number | null) => void;
}

/** A restaurant the source has already agreed this caller may open. */
export interface ReadyKitchen extends KitchenBase {
  readonly status: "ready";
  readonly userId: string;
  readonly profile: Profile;
  /** users.id — the actor on an audit row, and "is this my own order". */
  readonly actorId: number;
  readonly restaurantId: string;
  /** The same id as a number, for the service calls that take one. */
  readonly restaurantKey: number;
  readonly restaurant: Membership;
  readonly role: StaffRole;
  readonly permissions: ReadonlySet<Permission>;
  /** The single gate. Ask this, never `role === "manager"`. */
  readonly can: (permission: Permission) => boolean;
}

export type Kitchen = KitchenBase | ReadyKitchen;

export function isReady(kitchen: Kitchen): kitchen is ReadyKitchen {
  return kitchen.status === "ready";
}

function readStoredSelection(userId: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(`${SELECTION_KEY_PREFIX}${userId}`);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function writeStoredSelection(userId: string, restaurantId: number | null): void {
  if (typeof window === "undefined") return;
  const key = `${SELECTION_KEY_PREFIX}${userId}`;
  if (restaurantId === null) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, String(restaurantId));
}

const KitchenContext = React.createContext<Kitchen | null>(null);

export function KitchenProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const { status: sessionStatus, profile, memberships, error } = useSession();
  const userId = profile === null ? null : String(profile.id);

  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  // localStorage is read after mount, never during render: the server has no
  // idea what this tablet last had open, and guessing would be a hydration
  // mismatch. A different profile signing in re-reads its own key.
  React.useEffect(() => {
    setSelectedId(userId === null ? null : readStoredSelection(userId));
  }, [userId]);

  const select = React.useCallback(
    (restaurantId: number | null): void => {
      setSelectedId(restaurantId);
      if (userId !== null) writeStoredSelection(userId, restaurantId);
    },
    [userId],
  );

  // One restaurant is not a choice worth making, and a restaurant left in
  // localStorage that this person no longer works in would be refused on every
  // screen. Both are corrected here, once, rather than on every page.
  React.useEffect(() => {
    if (userId === null || sessionStatus !== "authenticated") return;

    const isStillValid = memberships.some((row) => row.id === selectedId);
    if (isStillValid) return;

    const only = memberships.length === 1 ? memberships[0] : undefined;
    const next = only === undefined ? null : only.id;
    if (next !== selectedId) select(next);
  }, [memberships, selectedId, select, sessionStatus, userId]);

  const value = React.useMemo<Kitchen>(() => {
    const base: KitchenBase = {
      status: "loading",
      userId,
      restaurantId: selectedId === null ? null : String(selectedId),
      restaurants: memberships,
      error,
      select,
    };

    if (sessionStatus === "loading") return base;
    if (sessionStatus === "unauthenticated") {
      return { ...base, status: error == null ? "signed-out" : "error" };
    }
    if (profile === null || userId === null) return base;
    if (memberships.length === 0) return { ...base, status: "no-membership" };

    const restaurant = memberships.find((row) => row.id === selectedId);
    if (restaurant === undefined) return { ...base, status: "unselected" };

    const permissions = resolvePermissions(restaurant.role, restaurant.granted);

    return {
      ...base,
      status: "ready",
      userId,
      profile,
      actorId: profile.id,
      restaurantId: String(restaurant.id),
      restaurantKey: restaurant.id,
      restaurant,
      role: restaurant.role,
      permissions,
      can: (permission) => permissions.has(permission),
    };
  }, [userId, profile, selectedId, memberships, error, select, sessionStatus]);

  return <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>;
}

export function useKitchen(): Kitchen {
  const value = React.useContext(KitchenContext);
  if (value === null) {
    throw new Error(
      "useKitchen must be used inside <KitchenProvider>, which AppShell mounts.",
    );
  }
  return value;
}
