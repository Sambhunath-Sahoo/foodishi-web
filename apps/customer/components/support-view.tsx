"use client";

import * as React from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  PageTitle,
  SegmentedControl,
} from "@repo/ui";
import { SupportTicketForm } from "./support-ticket-form";
import { SupportContactCard } from "./support-contact-card";
import { IS_TICKET_FORM_ENABLED } from "../lib/support-contact";
import { LoadingLines } from "./data-states";
import { formatDateTime } from "../lib/format";
import { useAccount } from "../lib/use-account";
import { useOrderHistory } from "../lib/queries/orders";
import { topicLabel, useSupport, type SupportTicket } from "../lib/support";
import { SEGMENTED_TAP_TARGET } from "../lib/tap-targets";

const FILTERS = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

/** Help. Raise a ticket, and read back what has already been raised. */
export function SupportView(): React.JSX.Element {
  const { userId } = useAccount();
  const { tickets, isReady, close } = useSupport();
  const [filter, setFilter] = React.useState<Filter>("open");

  // Only the first page: this is a picker, not a history screen.
  const history = useOrderHistory(userId, 0, false);
  const orderOptions = React.useMemo(
    () =>
      (history.data?.items ?? []).map((order) => ({
        id: order.id,
        label: `#${order.id} · ${formatDateTime(order.placed_at)}`,
      })),
    [history.data],
  );

  const shown = tickets.filter((ticket) => ticket.status === filter);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle subtitle="Reach a person about an order">Support</PageTitle>

      {/* A person first. The ticket form only ever stored on this device, so
          it stays behind a flag until tickets reach an agent. */}
      <Card>
        <CardHeader>
          <CardTitle>Talk to us</CardTitle>
        </CardHeader>
        <CardBody>
          <SupportContactCard />
          <p className="mt-3 text-[13px] text-ink-2">
            About one order? Open it and tap Get help, so we know which one.
          </p>
          <Link
            href="/orders"
            className="inline-flex min-h-11 items-center text-[13px] font-medium text-accent"
          >
            Your orders
          </Link>
        </CardBody>
      </Card>

      {IS_TICKET_FORM_ENABLED ? <SupportTicketForm orderOptions={orderOptions} /> : null}

      {/* Shown with the form on, or to keep tickets raised before it was
          switched off readable. */}
      {IS_TICKET_FORM_ENABLED || tickets.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your tickets</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <SegmentedControl<Filter>
              options={FILTERS.map((row) => ({
                value: row.value,
                label: row.label,
                count: tickets.filter((ticket) => ticket.status === row.value).length,
              }))}
              value={filter}
              onValueChange={setFilter}
              ariaLabel="Ticket status"
              className={SEGMENTED_TAP_TARGET}
            />

            {!isReady ? (
              <LoadingLines count={2} label="Loading tickets" />
            ) : shown.length === 0 ? (
              <EmptyState
                title={filter === "open" ? "No open tickets" : "No closed tickets"}
                detail={
                  filter === "open"
                    ? "Anything you report shows up here with a reference."
                    : "Tickets you close are kept here."
                }
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {shown.map((ticket) => (
                  <TicketRow key={ticket.id} ticket={ticket} onClose={close} />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function TicketRow({
  ticket,
  onClose,
}: {
  readonly ticket: SupportTicket;
  readonly onClose: (id: string) => void;
}): React.JSX.Element {
  return (
    <li className="rounded-card border border-line bg-surface-2 px-3.5 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">{ticket.subject}</p>
          <p className="mt-0.5 font-mono text-[12px] text-ink-3">{ticket.reference}</p>
        </div>
        <Badge tone={ticket.status === "open" ? "warn" : "mute"}>
          {ticket.status === "open" ? "Open" : "Closed"}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone="cool">{topicLabel(ticket.topic)}</Badge>
        {ticket.orderId !== null ? (
          <Link
            href={`/orders/${ticket.orderId}`}
            className="inline-flex min-h-11 items-center text-[12px] font-medium text-accent"
          >
            {`Order #${ticket.orderId}`}
          </Link>
        ) : null}
        <span className="text-[12px] tabular-nums text-ink-3">
          {formatDateTime(ticket.createdAt)}
        </span>
      </div>

      <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink-2">
        {ticket.detail}
      </p>

      {ticket.status === "open" ? (
        <div className="mt-3">
          <Button variant="outline" size="sm" className="h-11" onClick={() => onClose(ticket.id)}>
            Close ticket
          </Button>
        </div>
      ) : null}
    </li>
  );
}
