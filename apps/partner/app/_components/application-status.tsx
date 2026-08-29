"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Card, CardBody, CardHeader, CardTitle } from "@repo/ui";
import type { RestaurantApplication } from "../../lib/types";

/**
 * Where an application has got to, said once.
 *
 * Rendered in two places that must never tell different stories: the /apply
 * screen after a submit, and the console's own no-kitchen screen for an account
 * that is waiting. Written here rather than twice for exactly that reason.
 *
 * Each state answers one question — what happens next — because that is the only
 * question the person reading it has. A status badge on its own is a state
 * machine's view of an application, not an applicant's.
 */

const TONE: Record<
  RestaurantApplication["status"],
  { readonly badge: "accent" | "mute" | "ok"; readonly label: string }
> = {
  pending: { badge: "accent", label: "With Foodishi" },
  approved: { badge: "ok", label: "Approved" },
  rejected: { badge: "mute", label: "Not accepted" },
};

function formatWhen(at: string): string {
  const parsed = new Date(at);
  return Number.isNaN(parsed.getTime())
    ? at
    : parsed.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function PendingBody({
  application,
}: {
  readonly application: RestaurantApplication;
}): React.JSX.Element {
  return (
    <>
      <p className="text-[14px] leading-relaxed text-ink-2">
        Sent on {formatWhen(application.created_at)}. Somebody at Foodishi reads
        every application by hand, so this is a wait measured in hours rather
        than minutes. The answer arrives by email at the address you signed up
        with, and this screen changes on its own when it does.
      </p>
      <p className="text-[13px] leading-relaxed text-ink-3">
        Nothing else is needed from you in the meantime. There is no menu to
        write yet — the restaurant does not exist until the application is
        accepted.
      </p>
    </>
  );
}

function ApprovedBody({
  application,
}: {
  readonly application: RestaurantApplication;
}): React.JSX.Element {
  return (
    <>
      <p className="text-[14px] leading-relaxed text-ink-2">
        {application.name} is on Foodishi, and it is yours to run. It is{" "}
        <span className="font-medium text-ink">closed to customers</span> until
        you open it — nobody can find it in search or place an order yet, which
        is deliberate: an empty menu that took orders would fail at a
        customer&apos;s checkout.
      </p>
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[14px] text-ink-2">
        <li>
          Add your dishes under <span className="font-medium text-ink">Menu</span>.
        </li>
        <li>
          Check your charges and cancellation window under{" "}
          <span className="font-medium text-ink">Restaurant</span>.
        </li>
        <li>Then turn on “Taking orders”, and you are trading.</li>
      </ol>
      <Link
        href="/menu"
        className="self-start rounded-card border border-accent/25 bg-accent-soft px-4 py-2 text-[14px] font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Start with the menu
      </Link>
    </>
  );
}

function RejectedBody({
  application,
}: {
  readonly application: RestaurantApplication;
}): React.JSX.Element {
  return (
    <>
      <p className="text-[14px] leading-relaxed text-ink-2">
        Foodishi did not accept this application
        {application.reviewed_at === null
          ? ""
          : ` on ${formatWhen(application.reviewed_at)}`}
        .
      </p>
      {/* Verbatim, in the operator's own words and never summarised: on a
          refusal this is the only sentence that says what to change. */}
      {application.decision_note === null ? null : (
        <blockquote className="border-l-[3px] border-line-2 pl-3 text-[14px] leading-relaxed text-ink">
          {application.decision_note}
        </blockquote>
      )}
      <p className="text-[13px] leading-relaxed text-ink-3">
        You can send another application once you have addressed it.
      </p>
      <Link
        href="/apply"
        className="self-start rounded-card border border-line-2 px-4 py-2 text-[14px] font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Apply again
      </Link>
    </>
  );
}

export function ApplicationStatusCard({
  application,
}: {
  readonly application: RestaurantApplication;
}): React.JSX.Element {
  const tone = TONE[application.status];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{application.name}</CardTitle>
        <Badge tone={tone.badge}>{tone.label}</Badge>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        {application.status === "pending" ? (
          <PendingBody application={application} />
        ) : null}
        {application.status === "approved" ? (
          <ApprovedBody application={application} />
        ) : null}
        {application.status === "rejected" ? (
          <RejectedBody application={application} />
        ) : null}
      </CardBody>
    </Card>
  );
}
