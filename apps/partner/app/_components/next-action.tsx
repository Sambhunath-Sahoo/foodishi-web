"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { Button, ErrorBanner } from "@repo/ui";
import { RefusedNote } from "./states";
import { getNextTransition, getWaitingNote } from "../_lib/transitions";
import { PERMISSION_LABELS, ROLE_LABELS } from "../../lib/permissions";
import { useOrderStatusMutation } from "../../lib/queries/orders";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { Order } from "../../lib/types";

export interface NextActionProps {
  readonly order: Order;
  readonly kitchen: ReadyKitchen;
  readonly now: number;
}

/**
 * The one thing to press. It is the biggest element on the card, it names the
 * move in a verb, and it states what the move promises underneath — using this
 * order's own promise, not a guess.
 *
 * Somebody without the permission for this particular move gets the sentence
 * instead of the button. Not a disabled button: a disabled control invites a
 * tap and then explains itself in a tooltip nobody hovers on a tablet, and this
 * is not a temporary state that will clear.
 */
export function NextAction({
  order,
  kitchen,
  now,
}: NextActionProps): React.JSX.Element {
  const mutation = useOrderStatusMutation(kitchen, order.id);
  const next = getNextTransition(order.status, order.promised_at, now);

  if (next === null) {
    const note = getWaitingNote(order.status);
    return (
      // A bordered, filled panel for "Delivered." spent about 70px announcing
      // that there is nothing to do. The absence of a button is already the
      // signal; this is just the sentence that names why.
      <p className="text-[15px] leading-snug text-ink-3">
        {note ?? "Nothing for the kitchen to do on this order."}
      </p>
    );
  }

  if (!kitchen.can(next.needs)) {
    return (
      <RefusedNote
        title={`${next.label} is not yours to press`}
        detail={`You are signed in as ${ROLE_LABELS[kitchen.role].toLowerCase()}, and this move needs permission to ${PERMISSION_LABELS[next.needs].toLowerCase()}. Ask a manager here, or ask them to grant it.`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        block
        className="h-auto min-h-20 flex-col gap-1 py-4 whitespace-normal"
        isPending={mutation.isPending}
        pendingLabel="Saving…"
        onClick={() => {
          mutation.mutate(next.toStatus);
        }}
      >
        <span className="text-xl font-semibold">{next.label}</span>
        <span className="text-[14px] font-normal opacity-90">{next.consequence}</span>
      </Button>

      {mutation.error !== null ? (
        <ErrorBanner
          title="That move was refused"
          message={toUserMessage(mutation.error)}
        />
      ) : null}
    </div>
  );
}
