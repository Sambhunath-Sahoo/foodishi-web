"use client";

import { createLocalStore, isRecord, localId, parseList } from "./local-store";

/**
 * Support tickets. Browser-only for now — there is no /support endpoint — so a
 * ticket is a record of what the customer reported, not something an agent can
 * see yet. The UI says so rather than implying a reply is coming.
 */
const STORAGE_KEY = "foodishi.customer.support.v1";

export const TICKET_TOPICS = [
  {
    value: "missing_item",
    label: "Missing item",
    hint: "Something you paid for was not in the bag.",
  },
  {
    value: "wrong_item",
    label: "Wrong item",
    hint: "You were sent something you did not order.",
  },
  {
    value: "food_quality",
    label: "Food quality",
    hint: "Cold, spilled, or not what the menu described.",
  },
  {
    value: "delivery",
    label: "Delivery problem",
    hint: "Late, never arrived, or the rider could not be reached.",
  },
  {
    value: "refund",
    label: "Refund request",
    hint: "You want money back on a completed order.",
  },
  {
    value: "other",
    label: "Something else",
    hint: "Anything the topics above do not cover.",
  },
] as const;

export type TicketTopic = (typeof TICKET_TOPICS)[number]["value"];

/** Open until the customer closes it: nothing on this device can resolve one. */
export type TicketStatus = "open" | "closed";

export interface SupportTicket {
  readonly id: string;
  readonly reference: string;
  readonly topic: TicketTopic;
  /** Null when the ticket is not about one specific order. */
  readonly orderId: number | null;
  readonly subject: string;
  readonly detail: string;
  readonly status: TicketStatus;
  readonly createdAt: string;
}

const TOPIC_VALUES: readonly string[] = TICKET_TOPICS.map((topic) => topic.value);

function isSupportTicket(value: unknown): value is SupportTicket {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.reference === "string" &&
    typeof value.topic === "string" &&
    TOPIC_VALUES.includes(value.topic) &&
    typeof value.subject === "string" &&
    typeof value.detail === "string" &&
    (value.status === "open" || value.status === "closed") &&
    typeof value.createdAt === "string"
  );
}

const store = createLocalStore<readonly SupportTicket[]>(STORAGE_KEY, [], (raw) =>
  parseList(raw, isSupportTicket),
);

export function topicLabel(topic: TicketTopic): string {
  return TICKET_TOPICS.find((row) => row.value === topic)?.label ?? "Support";
}

/** Short, shoutable, and unique enough for a device-local list. */
function nextReference(): string {
  return `TK-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 4)
    .toUpperCase()}`;
}

export interface TicketDraft {
  readonly topic: TicketTopic;
  readonly orderId: number | null;
  readonly subject: string;
  readonly detail: string;
}

export interface SupportApi {
  readonly tickets: readonly SupportTicket[];
  readonly isReady: boolean;
  readonly openCount: number;
  readonly forOrder: (orderId: number) => readonly SupportTicket[];
  /** Returns the created ticket so the caller can show its reference. */
  readonly raise: (draft: TicketDraft) => SupportTicket;
  readonly close: (id: string) => void;
}

export function useSupport(): SupportApi {
  const [tickets, isReady] = store.use();

  return {
    tickets,
    isReady,
    openCount: tickets.filter((ticket) => ticket.status === "open").length,
    forOrder: (orderId) => tickets.filter((ticket) => ticket.orderId === orderId),

    raise: (draft) => {
      const ticket: SupportTicket = {
        id: localId("tkt"),
        reference: nextReference(),
        topic: draft.topic,
        orderId: draft.orderId,
        subject: draft.subject.trim(),
        detail: draft.detail.trim(),
        status: "open",
        createdAt: new Date().toISOString(),
      };
      store.update((current) => [ticket, ...current]);
      return ticket;
    },

    close: (id) => {
      store.update((current) =>
        current.map((ticket) =>
          ticket.id === id ? { ...ticket, status: "closed" } : ticket,
        ),
      );
    },
  };
}
