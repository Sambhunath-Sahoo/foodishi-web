"use client";

import * as React from "react";
import { PageTitle } from "@repo/ui";
import { HoursCard } from "./hours-card";
import { OpenCloseCard } from "./open-close-card";
import { PolicyCard } from "./policy-card";
import { ProfileCard } from "./profile-card";
import { KitchenGate } from "../_components/kitchen-gate";
import { CardSkeletons, LoadError, RefusedNote } from "../_components/states";
import { ROLE_LABELS } from "../../lib/permissions";
import { useRestaurant } from "../../lib/queries/restaurant";
import type { ReadyKitchen } from "../../lib/kitchen";

function Settings({ kitchen }: { readonly kitchen: ReadyKitchen }): React.JSX.Element {
  // The whole profile, not the membership row behind the header: that one
  // carries a name, a city and is_active, and this screen edits twelve more
  // columns. It is also unfiltered on is_active, which is the only reason a
  // closed restaurant can load this page and reopen itself.
  const restaurant = useRestaurant(kitchen);

  if (restaurant.isPending) {
    return <CardSkeletons count={2} label="Loading this restaurant" />;
  }

  if (restaurant.error !== null) {
    return (
      <LoadError
        error={restaurant.error}
        title="Could not load this restaurant"
        onRetry={() => {
          void restaurant.refetch();
        }}
      />
    );
  }

  if (restaurant.data === undefined) return <></>;

  return (
    <div className="flex flex-col gap-4">
      {!kitchen.can("restaurant.edit") ? (
        <RefusedNote
          title="Read-only for you"
          detail={`Closing the restaurant and editing its details need a manager, and you are signed in as ${ROLE_LABELS[kitchen.role].toLowerCase()}. Everything below shows the current state but will not save.`}
        />
      ) : null}

      <OpenCloseCard kitchen={kitchen} restaurant={restaurant.data} />
      <HoursCard kitchen={kitchen} restaurant={restaurant.data} />
      <ProfileCard kitchen={kitchen} restaurant={restaurant.data} />
      <PolicyCard kitchen={kitchen} />
    </div>
  );
}

/**
 * The open/close switch first, then the hours, then the profile, then the
 * charges — the order somebody standing in a restaurant needs them in. The
 * things a customer merely reads sit below the one that decides whether there is
 * a customer at all.
 */
export default function SettingsPage(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle subtitle="Stop and start taking orders, and keep what a customer reads before ordering true.">
        Restaurant
      </PageTitle>

      <KitchenGate
        loadingCards={2}
        loadingLabel="Loading this restaurant"
        requires="restaurant.view"
      >
        {(kitchen) => <Settings kitchen={kitchen} />}
      </KitchenGate>
    </div>
  );
}
