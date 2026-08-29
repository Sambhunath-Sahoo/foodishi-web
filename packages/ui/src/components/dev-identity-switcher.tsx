"use client";

import * as React from "react";
import {
  getIdentity,
  setRestaurantId,
  setUserId,
  subscribeToIdentity,
  type DevIdentity,
} from "@repo/api-client";
import { Select, type SelectOption } from "./select";
import { cn } from "../lib/cn";

/**
 * PHASE-1 STAND-IN — NOT A LOGIN.
 *
 * Auth is deferred (decision D2): the API takes user_id and restaurant_id as
 * plain parameters and issues no token. This dropdown only records who the
 * developer is pretending to be, in localStorage. It grants nothing and
 * verifies nothing. Delete it when real auth lands.
 */
export interface DevIdentitySwitcherProps {
  readonly users?: readonly SelectOption[];
  readonly restaurants?: readonly SelectOption[];
  readonly className?: string;
}

function useDevIdentity(): DevIdentity {
  const [identity, setIdentity] = React.useState<DevIdentity>({
    userId: null,
    restaurantId: null,
  });

  React.useEffect(() => {
    setIdentity(getIdentity());
    return subscribeToIdentity(() => setIdentity(getIdentity()));
  }, []);

  return identity;
}

export function DevIdentitySwitcher({
  users = [],
  restaurants = [],
  className,
}: DevIdentitySwitcherProps): React.JSX.Element {
  const identity = useDevIdentity();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-card border border-dashed border-line-2 bg-surface-2 px-3 py-2",
        className,
      )}
    >
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-3">
        dev identity
      </span>

      {users.length > 0 ? (
        <Select
          id="dev-identity-user"
          aria-label="Acting as user"
          className="h-8 w-52 text-[13px]"
          options={users}
          placeholder="No user"
          value={identity.userId ?? ""}
          onChange={(event) => setUserId(event.target.value || null)}
        />
      ) : null}

      {restaurants.length > 0 ? (
        <Select
          id="dev-identity-restaurant"
          aria-label="Acting for restaurant"
          className="h-8 w-52 text-[13px]"
          options={restaurants}
          placeholder="No restaurant"
          value={identity.restaurantId ?? ""}
          onChange={(event) => setRestaurantId(event.target.value || null)}
        />
      ) : null}
    </div>
  );
}
