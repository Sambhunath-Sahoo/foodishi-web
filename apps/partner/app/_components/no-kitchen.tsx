"use client";

import * as React from "react";
import { EmptyCard } from "./states";

/**
 * The dead end for a signed-in account that works nowhere.
 *
 * No membership came back, which is not the same as a quiet service: there is
 * no queue to be empty. Saying so — once, in one place — keeps the shell and
 * the page gate from drifting into two different stories.
 */
export function NoKitchenNotice(): React.JSX.Element {
  return (
    <EmptyCard
      title="This account does not work at any restaurant"
      detail="Nobody has given this account access to a restaurant, so there is no order queue, menu or till to show — not an empty one, none at all. Ask a manager to add you to theirs, then sign in again."
    />
  );
}
