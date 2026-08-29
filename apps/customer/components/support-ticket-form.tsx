"use client";

import * as React from "react";
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Select } from "@repo/ui";
import { TICKET_TOPICS, useSupport, type TicketTopic } from "../lib/support";

const MAX_DETAIL = 1000;
const MAX_SUBJECT = 100;

const TOPIC_OPTIONS = TICKET_TOPICS.map((topic) => ({
  value: topic.value,
  label: topic.label,
}));

/**
 * Raise a ticket. `orderId` is prefilled when this is opened from an order, so
 * reporting a missing item does not make the customer retype which order.
 */
export function SupportTicketForm({
  defaultTopic = "other",
  orderId = null,
  orderOptions = [],
  title = "Raise a ticket",
}: {
  readonly defaultTopic?: TicketTopic;
  readonly orderId?: number | null;
  /** Recent orders to attach to, when this is opened from the support page. */
  readonly orderOptions?: readonly { readonly id: number; readonly label: string }[];
  /** The card's own heading, so a host screen never has to nest a second card. */
  readonly title?: string;
}): React.JSX.Element {
  const { raise } = useSupport();

  const [topic, setTopic] = React.useState<TicketTopic>(defaultTopic);
  const [subject, setSubject] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [attachedOrder, setAttachedOrder] = React.useState<string>(
    orderId === null ? "" : String(orderId),
  );
  const [reference, setReference] = React.useState<string | null>(null);

  const hint = TICKET_TOPICS.find((row) => row.value === topic)?.hint ?? "";
  const isValid = subject.trim().length > 2 && detail.trim().length > 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isValid) return;
            const ticket = raise({
              topic,
              orderId:
                attachedOrder === "" ? null : Number.parseInt(attachedOrder, 10),
              subject,
              detail,
            });
            setReference(ticket.reference);
            setSubject("");
            setDetail("");
          }}
        >
          <div>
            <label
              htmlFor="ticket-topic"
              className="mb-1.5 block text-[13px] font-medium text-ink-2"
            >
              What went wrong?
            </label>
            <Select
              id="ticket-topic"
              options={TOPIC_OPTIONS}
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value as TicketTopic);
                setReference(null);
              }}
            />
            <p className="mt-1.5 text-[12px] text-ink-3">{hint}</p>
          </div>

          {orderId === null && orderOptions.length > 0 ? (
            <div>
              <label
                htmlFor="ticket-order"
                className="mb-1.5 block text-[13px] font-medium text-ink-2"
              >
                Which order? <span className="font-normal text-ink-3">Optional</span>
              </label>
              <Select
                id="ticket-order"
                options={[
                  { value: "", label: "Not about one order" },
                  ...orderOptions.map((row) => ({
                    value: String(row.id),
                    label: row.label,
                  })),
                ]}
                value={attachedOrder}
                onChange={(event) => setAttachedOrder(event.target.value)}
              />
            </div>
          ) : null}

          {orderId !== null ? (
            <p className="text-[13px] text-ink-2">
              About <Badge tone="mute">{`Order #${orderId}`}</Badge>
            </p>
          ) : null}

          <div>
            <label
              htmlFor="ticket-subject"
              className="mb-1.5 block text-[13px] font-medium text-ink-2"
            >
              One line summary
            </label>
            <input
              id="ticket-subject"
              value={subject}
              maxLength={MAX_SUBJECT}
              placeholder="Two naans missing from the bag"
              onChange={(event) => {
                setSubject(event.target.value);
                setReference(null);
              }}
              className="h-10 w-full rounded-card border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-ink-4 focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-accent"
            />
          </div>

          <div>
            <label
              htmlFor="ticket-detail"
              className="mb-1.5 block text-[13px] font-medium text-ink-2"
            >
              What happened?
            </label>
            <textarea
              id="ticket-detail"
              value={detail}
              rows={4}
              maxLength={MAX_DETAIL}
              placeholder="Ordered two butter naans with the biryani. The bag had the biryani only."
              onChange={(event) => {
                setDetail(event.target.value);
                setReference(null);
              }}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-[14px] text-ink placeholder:text-ink-4 focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-accent"
            />
            <p className="mt-1 text-right text-[12px] tabular-nums text-ink-3">
              {`${detail.length}/${MAX_DETAIL}`}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={!isValid} block>
              Submit ticket
            </Button>
            {reference !== null ? (
              <p aria-live="polite" className="text-[13px] text-ok">
                {`Logged as ${reference}. Saved on this device — no agent has seen it yet.`}
              </p>
            ) : (
              <p className="text-[12px] leading-relaxed text-ink-3">
                Tickets are stored on this device. There is no support endpoint
                yet, so nothing is sent and nobody will reply.
              </p>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
