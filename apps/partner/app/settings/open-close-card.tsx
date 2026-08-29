"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Dialog,
  cn,
} from "@repo/ui";
import { useSetAcceptingOrders } from "../../lib/queries/restaurant";
import type { RestaurantDetail } from "../../lib/types";
import { ROLE_LABELS } from "../../lib/permissions";
import type { ReadyKitchen } from "../../lib/kitchen";

/**
 * The one control on this screen somebody taps mid-service, so it is the
 * loudest thing on it: a full-width target with the state word on top and what
 * the tap will do underneath (DESIGN.md copy rules), the same shape as the
 * availability switch on the menu.
 *
 * It writes PUT /restaurants/{id}/availability, which is its own route rather
 * than a field on the profile PATCH: it sets restaurants.is_active, the only
 * column the placement path consults — pricing a cart refuses with "… is not
 * currently accepting orders" when it is false. The trading hours below are
 * read by nothing but the customer's "open now" filter, which is why they are
 * labelled Hours and never Open.
 *
 * Closing is destructive in the only sense a kitchen cares about — turnover
 * stops — so it is an outlined button behind a confirm that names the
 * restaurant (DESIGN.md non-negotiable #5). Opening is not, and takes one tap.
 */
export function OpenCloseCard({
  kitchen,
  restaurant,
}: {
  readonly kitchen: ReadyKitchen;
  readonly restaurant: RestaurantDetail;
}): React.JSX.Element {
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const mutation = useSetAcceptingOrders(kitchen);
  const canEditRestaurant = kitchen.can("restaurant.edit");

  const isOpen = restaurant.is_active;

  function setActive(nextIsActive: boolean): void {
    mutation.mutate(nextIsActive, {
      onSuccess: () => setIsConfirmOpen(false),
    });
  }

  const consequence = isOpen
    ? `${restaurant.name} leaves search straight away and no new order can be placed. Tickets already in the queue are unaffected.`
    : `${restaurant.name} goes back into search and customers can order again.`;

  return (
    <Card stripe={isOpen ? "ok" : "crit"}>
      <CardHeader>
        <CardTitle>Taking orders</CardTitle>
        <Badge tone={isOpen ? "ok" : "crit"}>{isOpen ? "Open" : "Closed"}</Badge>
      </CardHeader>

      <CardBody className="flex flex-col gap-3">
        <p className="text-[15px] leading-snug text-ink-2">
          {isOpen
            ? "Customers can see this kitchen and order from it right now."
            : "Nobody can order. This kitchen is not listed and a cart naming it is refused."}
        </p>

        {/* h-auto and flex-col: the Button's own sizes are one line of text, and
            the consequence has to sit under the verb rather than in a tooltip
            nobody hovers on a tablet. */}
        <Button
          variant={isOpen ? "outline" : "primary"}
          block
          className={cn(
            "h-auto min-h-16 flex-col gap-0.5 py-3",
            isOpen && "text-crit hover:bg-crit-soft",
          )}
          disabled={!canEditRestaurant}
          isPending={mutation.isPending}
          pendingLabel={isOpen ? "Closing…" : "Opening…"}
          onClick={() => {
            if (isOpen) {
              setIsConfirmOpen(true);
              return;
            }
            setActive(true);
          }}
        >
          <span className="text-[17px] font-semibold">
            {isOpen ? "Close the kitchen" : "Open the kitchen"}
          </span>
          <span className="text-[12px] leading-snug font-normal whitespace-normal">
            {canEditRestaurant
              ? consequence
              : `Only a manager can change this — you are signed in as ${ROLE_LABELS[kitchen.role].toLowerCase()}.`}
          </span>
        </Button>

        {mutation.error !== null ? (
          <p role="alert" className="text-[13px] leading-snug text-crit">
            {toUserMessage(mutation.error)}
          </p>
        ) : null}

        {/*
          Two limits the route itself is explicit about, so they are stated here
          rather than hidden: there is no "until", and closing removes the
          restaurant from search rather than greying it out as closed.
        */}
        <p className="text-[12px] leading-snug text-ink-3">
          There is no timer — a closed kitchen stays closed until somebody opens
          it here. While it is closed it disappears from search rather than
          showing as closed, and tickets already taken still have to be cooked
          or cancelled one at a time.
        </p>
      </CardBody>

      <Dialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={`Close ${restaurant.name}?`}
        description={consequence}
        footer={
          <>
            <Button
              variant="ghost"
              className="min-h-11"
              onClick={() => setIsConfirmOpen(false)}
            >
              Keep it open
            </Button>
            {/* The system's destructive variant — outlined, never filled
                (DESIGN.md non-negotiable #5). It earns its crit border here,
                behind a confirm, where the row-level controls do not. */}
            <Button
              variant="danger"
              className="min-h-11"
              isPending={mutation.isPending}
              pendingLabel="Closing…"
              onClick={() => setActive(false)}
            >
              Close {restaurant.name}
            </Button>
          </>
        }
      >
        <p className="leading-snug">
          Nothing is lost — reopening is one tap on this screen, and the tickets
          in the queue still need cooking.
        </p>
        {mutation.error !== null ? (
          <p role="alert" className="mt-2 text-[13px] leading-snug text-crit">
            {toUserMessage(mutation.error)}
          </p>
        ) : null}
      </Dialog>
    </Card>
  );
}
