"use client";

import * as React from "react";
import { Badge, Card, CardBody, CardHeader, CardTitle, Thumb } from "@repo/ui";
import { ROLE_LABELS } from "../../lib/permissions";
import type { Membership } from "../../lib/types";

/**
 * Shown only when this person works in more than one restaurant. Every row here
 * came from the source's own answer to what this account may act for, so there
 * is no way to pick a restaurant and then be refused.
 */
export function RestaurantPicker({
  restaurants,
  selectedId,
  onSelect,
}: {
  readonly restaurants: readonly Membership[];
  readonly selectedId: string | null;
  readonly onSelect: (restaurantId: number) => void;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Which restaurant are you working in?</CardTitle>
        <span className="font-mono text-[13px] tabular-nums text-ink-3">
          {restaurants.length} restaurants
        </span>
      </CardHeader>
      <CardBody className="p-0">
        <ul className="flex flex-col">
          {restaurants.map((restaurant) => {
            const isCurrent = String(restaurant.id) === selectedId;
            return (
              <li key={restaurant.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  aria-current={isCurrent ? "true" : undefined}
                  onClick={() => onSelect(restaurant.id)}
                  className="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                >
                  {/* 48px: a tablet is read at arm's length, and the cover is
                      how somebody picks the right restaurant at a glance rather
                      than by reading two lines of text. */}
                  <Thumb src={restaurant.image_url} name={restaurant.name} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] leading-snug text-ink">
                      {restaurant.name}
                    </span>
                    <span className="mt-1 block text-[13px] text-ink-3">
                      {restaurant.city}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {/* Two different words that both mean something: this one is
                        the tablet's own selection, the crit badge is whether the
                        restaurant is taking orders at all. */}
                    {isCurrent ? <Badge tone="ok">Open here</Badge> : null}
                    {restaurant.is_active ? null : <Badge tone="crit">Closed</Badge>}
                    <Badge tone="accent">{ROLE_LABELS[restaurant.role]}</Badge>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
