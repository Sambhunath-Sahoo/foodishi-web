"use client";

import * as React from "react";
import Link from "next/link";
import { AuthSpinner } from "@repo/api-client";
import { Card, CardBody, ErrorBanner, PageTitle, ThemeSwitcher } from "@repo/ui";
import { AccountStep } from "./account-step";
import { ProfileStep } from "./profile-step";
import { RestaurantStep } from "./restaurant-step";
import { ApplicationStatusCard } from "../_components/application-status";
import { LoadError } from "../_components/states";
import { useMyApplications } from "../../lib/queries/applications";
import { useSession } from "../../lib/session";

/**
 * Applying to join, in two steps and one screen.
 *
 * The stages are derived from what is true rather than stepped through, which is
 * what makes this survive a reload, a bookmark and a back button: an applicant
 * who closed the tab after creating their account reopens /apply and lands on
 * the restaurant form, not back at the beginning, because they now have a
 * session and no application. Nothing here keeps a "step" in state that a
 * refresh could contradict.
 *
 * The one piece of real state is `hasJustSent`, and only because the list it
 * would otherwise read is a poll: after a submit the status card has to appear
 * on the same tap rather than on the next refetch.
 */
export function ApplyView(): React.JSX.Element {
  const { status, profile, memberships, error } = useSession();
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = React.useState(false);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col gap-5 px-5 py-10">
      <div className="flex justify-end">
        <ThemeSwitcher />
      </div>

      <PageTitle subtitle="Two steps: an account, then one form about your restaurant. Somebody at Foodishi reads every application, and you keep your account either way.">
        Put your restaurant on Foodishi
      </PageTitle>

      {status === "loading" ? <AuthSpinner label="Checking your session" /> : null}

      {/* A session read that FAILED is not the same as no session. Sending
          somebody to a sign-up form because the source was unreachable would
          have them create a second account for an application they already
          sent. */}
      {error != null ? (
        <ErrorBanner
          title="Could not check whether you are signed in"
          message={
            error instanceof Error ? error.message : "The session could not be read."
          }
        />
      ) : null}

      {status === "unauthenticated" && error == null ? (
        needsEmailConfirmation ? (
          <ConfirmEmailNotice />
        ) : (
          <AccountStep onNeedsEmailConfirmation={() => setNeedsEmailConfirmation(true)} />
        )
      ) : null}

      {/* Signed in, no profile. The other half of sign-up, on its own — which is
          what a confirm-email project produces every time, because sign-up got
          no session to link with. */}
      {status === "unlinked" ? <ProfileStep /> : null}

      {status === "authenticated" && profile !== null ? (
        <SignedIn
          userId={String(profile.id)}
          hasRestaurant={memberships.length > 0}
        />
      ) : null}
    </div>
  );
}

/**
 * The stop between the two halves of sign-up.
 *
 * The heading names what has NOT happened, because the previous one — "Check
 * your inbox" — let somebody who had just filled in a five-field form and
 * pressed Continue believe they had applied. They had made an account. Nothing
 * reached the operator's queue, and the screen's own copy buried that under an
 * instruction about email.
 */
function ConfirmEmailNotice(): React.JSX.Element {
  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <p className="text-[15px] font-medium text-ink">
          Your account is made. Your application is not sent yet.
        </p>
        <p className="text-[14px] leading-relaxed text-ink-2">
          That was step 1 of 2 — it created your Foodishi account and nothing
          else. This project confirms email addresses before the first sign-in,
          so open the link we sent you and come back: step 2 is the form about
          your restaurant, and only that reaches Foodishi.
        </p>
        <Link
          href="/login"
          className="self-start rounded-card border border-line-2 px-4 py-2 text-[14px] font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Confirmed already? Sign in
        </Link>
      </CardBody>
    </Card>
  );
}

/**
 * What a signed-in visitor sees, decided by what they already have.
 *
 * Four answers, in the order that matters: an application still open beats
 * everything (there is nothing to do but wait), an answered one is shown so a
 * rejection can be read and acted on, and otherwise the form — including for
 * somebody who already runs a kitchen here and is opening a second.
 */
function SignedIn({
  userId,
  hasRestaurant,
}: {
  readonly userId: string;
  readonly hasRestaurant: boolean;
}): React.JSX.Element {
  const applications = useMyApplications(userId);
  const [hasJustSent, setHasJustSent] = React.useState(false);

  if (applications.isPending) {
    return <AuthSpinner label="Checking your applications" />;
  }

  if (applications.error !== null) {
    return (
      <LoadError
        error={applications.error}
        title="Could not check your applications"
        onRetry={() => {
          void applications.refetch();
        }}
      />
    );
  }

  const rows = applications.data ?? [];
  const pending = rows.find((row) => row.status === "pending");
  if (pending !== undefined) {
    return <ApplicationStatusCard application={pending} />;
  }

  // Just sent, and the poll has not come back with it yet. Only reachable for
  // one refetch interval, and the alternative is a form that reappears empty
  // over an application that was accepted a moment ago.
  const latest = rows[0];
  if (hasJustSent && latest !== undefined) {
    return <ApplicationStatusCard application={latest} />;
  }

  const answered = rows.find((row) => row.status === "rejected");

  return (
    <div className="flex flex-col gap-5">
      {answered !== undefined ? (
        <ApplicationStatusCard application={answered} />
      ) : null}

      {hasRestaurant ? (
        <p className="rounded-card border border-line bg-surface-2 px-3 py-2 text-[13px] leading-snug text-ink-3">
          You already run a restaurant on Foodishi. This form is for another one
          — your existing kitchen is untouched by it, and{" "}
          <Link href="/" className="text-accent underline-offset-2 hover:underline">
            your console is here
          </Link>
          .
        </p>
      ) : null}

      <RestaurantStep userId={userId} onSent={() => setHasJustSent(true)} />
    </div>
  );
}
