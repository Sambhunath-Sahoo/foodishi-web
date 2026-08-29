"use client";

import * as React from "react";
import { NoKitchenNotice } from "./no-kitchen";
import { RestaurantPicker } from "./restaurant-picker";
import { CardSkeletons, LoadError, RefusedNote } from "./states";
import { PERMISSION_LABELS, ROLE_LABELS } from "../../lib/permissions";
import { isReady, useKitchen, type ReadyKitchen } from "../../lib/kitchen";
import type { Permission } from "../../lib/types";

export interface KitchenGateProps {
  /** What to show while the membership is still being read. */
  readonly loadingLabel?: string;
  readonly loadingCards?: number;
  /**
   * The permission this screen needs to be worth opening at all.
   *
   * COSMETIC. The data source checks the same thing on every read and refuses
   * regardless of what this tablet drew — this just replaces an empty screen
   * with a sentence naming what is missing, which is what somebody who needs to
   * go and ask a manager for it actually needs.
   */
  readonly requires?: Permission;
  readonly children: (kitchen: ReadyKitchen) => React.ReactNode;
}

/**
 * One gate in front of every page, so no screen has to invent its own answer to
 * "which restaurant is this and may they be here".
 *
 * An account that works nowhere is told so plainly. Showing it an empty order
 * queue would read as a quiet day rather than as no access at all.
 */
export function KitchenGate({
  loadingLabel = "Loading this restaurant",
  loadingCards = 3,
  requires,
  children,
}: KitchenGateProps): React.JSX.Element {
  const kitchen = useKitchen();

  if (isReady(kitchen)) {
    if (requires !== undefined && !kitchen.can(requires)) {
      return (
        <RefusedNote
          title={`${PERMISSION_LABELS[requires]} is not part of your access`}
          detail={`You are signed in as ${ROLE_LABELS[kitchen.role].toLowerCase()} at ${kitchen.restaurant.name}, and this screen needs permission to ${PERMISSION_LABELS[requires].toLowerCase()}. A manager there can grant it from the Team screen.`}
        />
      );
    }
    return <>{children(kitchen)}</>;
  }

  if (kitchen.status === "loading" || kitchen.status === "signed-out") {
    return <CardSkeletons count={loadingCards} label={loadingLabel} />;
  }

  if (kitchen.status === "error") {
    return (
      <LoadError
        error={kitchen.error}
        title="Could not check which restaurants you work in"
      />
    );
  }

  // The shell already turns this whole screen into the dead end, nav and all.
  // Kept here so a page rendered outside that shell still cannot pretend the
  // queue is merely quiet.
  if (kitchen.status === "no-membership") return <NoKitchenNotice />;

  return (
    <RestaurantPicker
      restaurants={kitchen.restaurants}
      selectedId={kitchen.restaurantId}
      onSelect={kitchen.select}
    />
  );
}
