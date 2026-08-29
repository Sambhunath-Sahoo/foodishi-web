"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from "@repo/ui";
import { useUpdateRestaurant } from "../../lib/queries/restaurant";
import type { RestaurantDetail } from "../../lib/types";
import type { ReadyKitchen } from "../../lib/kitchen";

/** The API sends a full time ("11:00:00"); <input type="time"> wants HH:MM. */
const TIME_INPUT_LENGTH = 5;

function toTimeInput(value: string): string {
  return value.slice(0, TIME_INPUT_LENGTH);
}

/**
 * Trading hours, and deliberately not called Open or Closed.
 *
 * Nothing enforces these at order time — app/services/ordering.py checks
 * is_active and nothing else, so a ticket placed at 3am is accepted whatever
 * they say. The only reader is the customer's "open now" filter. Labelling them
 * as the open/close control would be the one lie this screen could tell, so the
 * switch above owns that word and this card says what these two times do.
 */
export function HoursCard({
  kitchen,
  restaurant,
}: {
  readonly kitchen: ReadyKitchen;
  readonly restaurant: RestaurantDetail;
}): React.JSX.Element {
  const mutation = useUpdateRestaurant(kitchen);
  const canEditRestaurant = kitchen.can("restaurant.edit");

  const savedOpensAt = toTimeInput(restaurant.opens_at);
  const savedClosesAt = toTimeInput(restaurant.closes_at);

  const [opensAt, setOpensAt] = React.useState(savedOpensAt);
  const [closesAt, setClosesAt] = React.useState(savedClosesAt);

  // Re-seeded when the server's answer changes — a save, or the other kitchen
  // being opened in the picker — so the fields never keep a stale edit.
  React.useEffect(() => {
    setOpensAt(savedOpensAt);
    setClosesAt(savedClosesAt);
  }, [savedOpensAt, savedClosesAt]);

  const isDirty = opensAt !== savedOpensAt || closesAt !== savedClosesAt;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours</CardTitle>
      </CardHeader>

      <CardBody>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ opens_at: opensAt, closes_at: closesAt });
          }}
        >
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[140px] flex-1">
              <Field label="Opens at" htmlFor="hours-opens-at">
                <Input
                  id="hours-opens-at"
                  type="time"
                  mono
                  required
                  value={opensAt}
                  disabled={!canEditRestaurant}
                  onChange={(event) => setOpensAt(event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
            <div className="min-w-[140px] flex-1">
              <Field label="Closes at" htmlFor="hours-closes-at">
                <Input
                  id="hours-closes-at"
                  type="time"
                  mono
                  required
                  value={closesAt}
                  disabled={!canEditRestaurant}
                  onChange={(event) => setClosesAt(event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
          </div>

          <p className="text-[12px] leading-snug text-ink-3">
            These are what customers browsing see, and what the &ldquo;open
            now&rdquo; filter reads. They do not stop an order on their own — use
            the switch above to stop taking orders.
          </p>

          {mutation.error !== null ? (
            <p role="alert" className="text-[13px] leading-snug text-crit">
              {toUserMessage(mutation.error)}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="submit"
              className="min-h-11"
              disabled={!canEditRestaurant || !isDirty}
              isPending={mutation.isPending}
              pendingLabel="Saving…"
            >
              Save hours
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
