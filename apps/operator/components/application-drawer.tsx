"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { Badge, Button, ErrorBanner } from "@repo/ui";
import { formatDateTime, formatMoneyWhole } from "../lib/format";
import { useApproveApplication, useRejectApplication } from "../lib/queries";
import type { RestaurantApplicationRow } from "../lib/api-types";
import { Sheet } from "./sheet";

/**
 * One application, in full, with the two answers under it.
 *
 * A panel and not a page because the decision is made against the list: an
 * operator works down a queue, opens one, answers it, and the queue is still
 * there behind them. A route per application would lose the place in the list on
 * every decision.
 *
 * Everything the applicant sent is shown, including the fields nobody usually
 * reads — the coordinates, the prep time. This is the only screen where they are
 * checkable, and each one is a promise the platform will make on the
 * restaurant's behalf later: the pin decides the delivery fee, the prep time
 * decides every ETA a customer is quoted.
 */

/** The API's own floor for a rejection reason. */
const REASON_MIN_LENGTH = 10;

function Row({
  label,
  value,
  mono = false,
}: {
  readonly label: string;
  readonly value: React.ReactNode;
  readonly mono?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-1.5">
      <dt className="shrink-0 text-[13px] text-ink-3">{label}</dt>
      <dd
        className={`text-right text-[13px] text-ink ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
        {title}
      </h3>
      <dl className="flex flex-col">{children}</dl>
    </section>
  );
}

/**
 * The two answers, and the asymmetry between them is deliberate.
 *
 * Approving takes one press: everything it needs was settled when the
 * application was sent, and asking an operator to retype any of it is asking
 * them to introduce a typo. Rejecting takes a reason first, because the
 * applicant reads it and a refusal they cannot act on means they send the same
 * form again and somebody here answers it twice.
 */
function Decision({
  application,
  onDecided,
}: {
  readonly application: RestaurantApplicationRow;
  readonly onDecided: () => void;
}): React.JSX.Element {
  const approve = useApproveApplication();
  const reject = useRejectApplication();
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const isBusy = approve.isPending || reject.isPending;
  const error = approve.error ?? reject.error;
  const canReject = reason.trim().length >= REASON_MIN_LENGTH && !isBusy;

  async function run(work: Promise<unknown>): Promise<void> {
    try {
      await work;
      onDecided();
    } catch {
      // Rendered from the mutation's own error below. Swallowed here so an
      // unhandled rejection does not take the console down over a 409 that the
      // banner is already explaining.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error === null ? null : (
        <ErrorBanner
          title="That decision did not go through"
          message={toUserMessage(error)}
        />
      )}

      {application.is_applicant_active ? null : (
        <ErrorBanner
          title="This applicant's account is switched off"
          message={`${application.applicant_email} cannot sign in, so approving this would create a restaurant nobody can edit. Reactivate the account under Customers first, or turn the application down.`}
        />
      )}

      {isRejecting ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="reject-reason"
            className="text-[13px] font-medium text-ink"
          >
            Why not? The applicant reads this.
          </label>
          <textarea
            id="reject-reason"
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="The street address is a block rather than a building, and we could not match the map pin to a kitchen. Send the full address with a unit number."
            className="w-full rounded-card border border-line-2 bg-surface px-3 py-2 font-sans text-[13px] text-ink placeholder:text-ink-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          />
          <p className="text-[12px] text-ink-3">
            At least {REASON_MIN_LENGTH} characters. Say what to change — they can
            apply again once they have.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canReject}
              onClick={() =>
                void run(
                  reject.mutateAsync({
                    applicationId: application.id,
                    reason: reason.trim(),
                  }),
                )
              }
            >
              {reject.isPending ? "Sending…" : "Turn it down"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isBusy}
              onClick={() => setIsRejecting(false)}
            >
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={isBusy || !application.is_applicant_active}
              onClick={() =>
                void run(
                  approve.mutateAsync({
                    applicationId: application.id,
                    note: null,
                  }),
                )
              }
            >
              {approve.isPending ? "Approving…" : "Approve"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() => setIsRejecting(true)}
            >
              Turn it down
            </Button>
          </div>
          {/* Said before the press, not after: an operator who expects approving
              to put a restaurant in front of customers would otherwise find out
              from a support call. */}
          <p className="text-[12px] leading-snug text-ink-3">
            Approving creates the restaurant <span className="text-ink">closed</span>{" "}
            and makes {application.applicant_name} its admin. Customers cannot see
            it until they open it themselves, once there is a menu behind it.
          </p>
        </div>
      )}
    </div>
  );
}

function Answered({
  application,
}: {
  readonly application: RestaurantApplicationRow;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-2 px-3 py-2">
      <p className="text-[13px] text-ink-2">
        {application.status === "approved" ? "Approved" : "Turned down"}
        {application.reviewed_at === null
          ? ""
          : ` on ${formatDateTime(application.reviewed_at)}`}
        {application.restaurant_id === null
          ? "."
          : `, as restaurant #${String(application.restaurant_id)}.`}
      </p>
      {application.decision_note === null ? null : (
        <blockquote className="border-l-[3px] border-line-2 pl-3 text-[13px] leading-relaxed text-ink">
          {application.decision_note}
        </blockquote>
      )}
    </div>
  );
}

export function ApplicationDrawer({
  application,
  onClose,
}: {
  readonly application: RestaurantApplicationRow | null;
  readonly onClose: () => void;
}): React.JSX.Element | null {
  if (application === null) return null;

  return (
    <Sheet
      open
      onClose={onClose}
      title={application.name}
      subtitle={
        <span className="flex items-center gap-2">
          <Badge
            tone={
              application.status === "pending"
                ? "accent"
                : application.status === "approved"
                  ? "ok"
                  : "mute"
            }
          >
            {application.status === "pending"
              ? "Waiting"
              : application.status === "approved"
                ? "Approved"
                : "Turned down"}
          </Badge>
          <span className="font-mono text-[12px] text-ink-3">
            /{application.slug}
          </span>
        </span>
      }
    >
      <div className="flex flex-col gap-5">
        {application.status === "pending" ? (
          <Decision application={application} onDecided={onClose} />
        ) : (
          <Answered application={application} />
        )}

        <Section title="Who is asking">
          <Row label="Applicant" value={application.applicant_name} />
          <Row label="Email" value={application.applicant_email} />
          <Row label="Phone" value={application.applicant_phone} mono />
          <Row
            label="Account"
            value={
              application.is_applicant_active ? "Active" : "Deactivated"
            }
          />
          <Row label="Sent" value={formatDateTime(application.created_at)} />
        </Section>

        <Section title="Where it is">
          <Row label="City" value={application.city} />
          <Row label="Area" value={application.area} />
          <Row label="Address" value={application.address_line} />
          <Row
            label="Map pin"
            value={`${application.latitude}, ${application.longitude}`}
            mono
          />
          <Row label="Kitchen phone" value={application.phone} mono />
        </Section>

        <Section title="How it trades">
          <Row
            label="Price for two"
            value={formatMoneyWhole(application.price_for_two)}
            mono
          />
          <Row
            label="Prep time"
            value={`${String(application.avg_prep_minutes)} min`}
            mono
          />
          <Row
            label="Hours"
            value={`${application.opens_at.slice(0, 5)} – ${application.closes_at.slice(0, 5)}`}
            mono
          />
        </Section>

        {application.description === null ? null : (
          <Section title="How they describe it">
            <p className="py-1.5 text-[13px] leading-relaxed text-ink-2">
              {application.description}
            </p>
          </Section>
        )}

        {application.note === null ? null : (
          <Section title="What they added">
            <p className="py-1.5 text-[13px] leading-relaxed text-ink-2">
              {application.note}
            </p>
          </Section>
        )}
      </div>
    </Sheet>
  );
}
