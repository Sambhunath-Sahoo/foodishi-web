"use client";

import * as React from "react";
import { DataTableCell, Skeleton, Thumb, type OrderStatus } from "@repo/ui";
import type { OrderRead } from "../lib/api-types";
import type { Lateness } from "../lib/sla";

/** Covers and avatars in a 38px row. */
const THUMB_PX = 22;

/** A rider is only attached once an order is off the pass. */
export const RIDER_STATUSES: readonly OrderStatus[] = [
  "ready_for_pickup",
  "out_for_delivery",
];

/**
 * Where a looked-up value stands. A name that has not arrived yet is not the
 * same answer as a name that does not exist, and the board used to print the
 * second while it was still waiting for the first (OP-2).
 */
export type Lookup = "loading" | "error" | "ready";

/** Narrows a query to the three answers a cell can give. */
export function lookupOf(query: {
  readonly isPending: boolean;
  readonly isError: boolean;
}): Lookup {
  if (query.isError) return "error";
  return query.isPending ? "loading" : "ready";
}

export interface BoardRow {
  readonly order: OrderRead;
  readonly lateness: Lateness | null;
  /** Undefined until the directory has answered, or when it has no such row. */
  readonly kitchen: string | undefined;
  readonly kitchenImageUrl: string | null;
  readonly customer: string | undefined;
  readonly customerAvatarUrl: string | null;
  readonly rider: string | undefined;
}

export interface BoardLookups {
  readonly kitchens: Lookup;
  readonly customers: Lookup;
  readonly riders: Lookup;
}

/** The width a name has while it loads. Matches a short kitchen name. */
const NAME_SKELETON = "h-3 w-[60px]";

function NameSkeleton({ label }: { readonly label: string }): React.JSX.Element {
  return <Skeleton className={NAME_SKELETON} label={label} />;
}

export function KitchenCell({
  row,
  lookup,
}: {
  readonly row: BoardRow;
  readonly lookup: Lookup;
}): React.JSX.Element {
  if (row.kitchen === undefined && lookup === "loading") {
    return (
      <DataTableCell className="max-w-[190px]">
        <NameSkeleton label="Loading the kitchen" />
      </DataTableCell>
    );
  }
  const name = row.kitchen ?? `Restaurant ${String(row.order.restaurant_id)}`;
  return (
    <DataTableCell className="max-w-[190px] text-ink">
      <span className="flex items-center gap-2">
        <Thumb src={row.kitchenImageUrl} name={name} size={THUMB_PX} />
        <span className="truncate">{name}</span>
      </span>
    </DataTableCell>
  );
}

export function CustomerCell({
  row,
  lookup,
}: {
  readonly row: BoardRow;
  readonly lookup: Lookup;
}): React.JSX.Element {
  if (row.customer === undefined) {
    return (
      <DataTableCell className="max-w-[170px] text-ink-3">
        {lookup === "loading" ? (
          <NameSkeleton label="Loading the customer" />
        ) : (
          <span title={`Account ${String(row.order.user_id)}`}>—</span>
        )}
      </DataTableCell>
    );
  }
  return (
    <DataTableCell className="max-w-[170px] text-ink-2">
      <span className="flex items-center gap-2">
        <Thumb
          src={row.customerAvatarUrl}
          name={row.customer}
          size={THUMB_PX}
          shape="circle"
        />
        <span className="truncate">{row.customer}</span>
      </span>
    </DataTableCell>
  );
}

/**
 * Who has the ride.
 *
 * "not assigned" is a claim an operator acts on — it is the sentence that
 * makes somebody reassign a rider — so it is only ever printed once the rider
 * lookup has answered and the order really has nobody. Before pickup an order
 * cannot have a rider at all, so it says nothing rather than "not assigned".
 */
export function RiderCell({
  row,
  lookup,
}: {
  readonly row: BoardRow;
  readonly lookup: Lookup;
}): React.JSX.Element {
  const canHaveRider = RIDER_STATUSES.includes(row.order.status);
  let content: React.ReactNode;
  if (!canHaveRider) {
    content = (
      <span className="text-ink-4" title="A rider is attached when the order leaves the kitchen">
        —
      </span>
    );
  } else if (row.rider !== undefined) {
    content = row.rider;
  } else if (lookup === "loading") {
    content = <NameSkeleton label="Loading the rider" />;
  } else if (lookup === "error") {
    content = <span className="text-ink-3">rider unknown</span>;
  } else {
    content = <span className="text-ink-3">not assigned</span>;
  }
  return <DataTableCell className="max-w-[150px] text-ink-3">{content}</DataTableCell>;
}
