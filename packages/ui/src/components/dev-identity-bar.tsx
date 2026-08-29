"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api, toUserMessage } from "@repo/api-client";
import { DevIdentitySwitcher } from "./dev-identity-switcher";
import type { SelectOption } from "./select";

/**
 * PHASE-1 STAND-IN — NOT A LOGIN. See dev-identity-switcher.tsx.
 *
 * Fills the switcher from the real /users and /restaurants lists so the ids
 * in localStorage always match rows that exist.
 */
interface Page<TItem> {
  readonly items: readonly TItem[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

interface NamedRow {
  readonly id: number;
  readonly name: string;
  readonly city?: string;
}

const IDENTITY_PAGE_SIZE = 50;

function toOptions(rows: readonly NamedRow[] | undefined): SelectOption[] {
  return (rows ?? []).map((row) => ({
    value: String(row.id),
    label: row.city !== undefined ? `${row.name} · ${row.city}` : row.name,
  }));
}

export interface DevIdentityBarProps {
  readonly showUsers?: boolean;
  readonly showRestaurants?: boolean;
  readonly className?: string;
}

export function DevIdentityBar({
  showUsers = true,
  showRestaurants = true,
  className,
}: DevIdentityBarProps): React.JSX.Element {
  const users = useQuery({
    queryKey: ["dev-identity", "users"],
    enabled: showUsers,
    queryFn: () =>
      api.get<Page<NamedRow>>("/users", {
        query: { limit: IDENTITY_PAGE_SIZE, offset: 0 },
      }),
  });

  const restaurants = useQuery({
    queryKey: ["dev-identity", "restaurants"],
    enabled: showRestaurants,
    queryFn: () =>
      api.get<Page<NamedRow>>("/restaurants", {
        query: { limit: IDENTITY_PAGE_SIZE, offset: 0 },
      }),
  });

  const failure = users.error ?? restaurants.error;

  if (failure !== null && failure !== undefined) {
    return (
      <p className="font-mono text-[11px] text-crit">
        Dev identity unavailable — {toUserMessage(failure)}
      </p>
    );
  }

  return (
    <DevIdentitySwitcher
      className={className}
      users={showUsers ? toOptions(users.data?.items) : []}
      restaurants={showRestaurants ? toOptions(restaurants.data?.items) : []}
    />
  );
}
