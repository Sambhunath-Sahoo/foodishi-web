"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardBody } from "@repo/ui";
import { ApplicationStatusCard } from "./application-status";
import { EmptyCard, LoadError } from "./states";
import { useMyApplications } from "../../lib/queries/applications";
import { useSession } from "../../lib/session";

/**
 * The screen for a signed-in account that works nowhere.
 *
 * There are three of those, and they used to be told as one. That was the whole
 * problem: a restaurateur who applied yesterday and a shift worker whose manager
 * has not added them yet were both shown "nobody has given this account access",
 * which is true for one of them and actively wrong for the other — it tells
 * somebody waiting on Foodishi to go and ask a manager who does not exist.
 *
 *   1. An application is open  → say so, and that there is nothing to do.
 *   2. An application was answered → the answer, in the operator's own words.
 *   3. Neither → a member of staff nobody has added, OR a restaurateur who has
 *      not applied. Both are offered the thing they came for.
 *
 * Reading applications from a screen about NOT having a restaurant is not a
 * detour: it is the only call that can tell these apart, and it is why the
 * console can stop guessing.
 */
export function NoKitchenNotice(): React.JSX.Element {
  const { profile } = useSession();
  // The shell only renders this under a resolved session, so a null profile here
  // is a state that cannot happen — but it is typed nullable, and a crash on the
  // one screen somebody lands on when nothing works is the worst place for one.
  const userId = profile === null ? null : String(profile.id);

  if (userId === null) return <NothingYet />;
  return <WithApplications userId={userId} />;
}

function WithApplications({
  userId,
}: {
  readonly userId: string;
}): React.JSX.Element {
  const applications = useMyApplications(userId);

  // No skeleton: this screen is already the answer to "why is there nothing
  // here", and a second empty state flashing under it says less than the plain
  // sentence does.
  if (applications.isPending) return <NothingYet />;

  if (applications.error !== null) {
    return (
      <div className="flex flex-col gap-4">
        <NothingYet />
        <LoadError
          error={applications.error}
          title="Could not check whether you have applied"
          onRetry={() => {
            void applications.refetch();
          }}
        />
      </div>
    );
  }

  const rows = applications.data ?? [];
  const open = rows.find((row) => row.status === "pending");
  if (open !== undefined) return <ApplicationStatusCard application={open} />;

  const answered = rows[0];
  if (answered !== undefined) {
    return <ApplicationStatusCard application={answered} />;
  }

  return <NothingYet />;
}

/**
 * Nobody has added this account anywhere, and it has never applied.
 *
 * Both doors, because this one screen has two audiences and no way to tell which
 * is reading: the sentence answers the shift worker, the card answers the owner.
 */
function NothingYet(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <EmptyCard
        title="This account does not work at any restaurant"
        detail="Nobody has given this account access to a restaurant, so there is no order queue, menu or till to show — not an empty one, none at all. If you work in a kitchen that is already on Foodishi, ask a manager there to add you, then sign in again."
      />
      <Card>
        <CardBody className="flex flex-col gap-2">
          <p className="text-[15px] font-medium text-ink">
            Do you run the restaurant?
          </p>
          <p className="text-[14px] leading-relaxed text-ink-2">
            Put it on Foodishi yourself. One form about the kitchen — where it is,
            when it opens, how long the food takes — and somebody at Foodishi
            answers it by hand.
          </p>
          <Link
            href="/apply"
            className="mt-1 self-start rounded-card border border-accent/25 bg-accent-soft px-4 py-2 text-[14px] font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Apply to join
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
