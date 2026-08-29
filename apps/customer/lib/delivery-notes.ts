"use client";

import { createLocalStore, isRecord } from "./local-store";

/**
 * "Leave it at the gate." OrderCreate now HAS a field for this — checkout sends
 * `delivery_note` with the order and the API stores it on orders.delivery_note.
 *
 * This store is what remains device-side: `draft` is what checkout is holding
 * before an order exists, and `byOrderId` is the historical record for orders
 * placed BEFORE the field shipped. The tracking screen prefers the server's copy
 * and falls back to this one, and it now says which of the two a note came from
 * rather than claiming every note is device-only.
 */
const STORAGE_KEY = "foodishi.customer.delivery-notes.v1";

export const MAX_NOTE_LENGTH = 200;

interface DeliveryNotes {
  readonly draft: string;
  readonly byOrderId: Readonly<Record<string, string>>;
}

const EMPTY: DeliveryNotes = { draft: "", byOrderId: {} };

function parseNotes(raw: unknown): DeliveryNotes {
  if (!isRecord(raw)) return EMPTY;
  const byOrderId: Record<string, string> = {};
  if (isRecord(raw.byOrderId)) {
    for (const [key, value] of Object.entries(raw.byOrderId)) {
      if (typeof value === "string") byOrderId[key] = value.slice(0, MAX_NOTE_LENGTH);
    }
  }
  return {
    draft: typeof raw.draft === "string" ? raw.draft.slice(0, MAX_NOTE_LENGTH) : "",
    byOrderId,
  };
}

const store = createLocalStore<DeliveryNotes>(STORAGE_KEY, EMPTY, parseNotes);

export interface DeliveryNotesApi {
  readonly draft: string;
  readonly isReady: boolean;
  readonly setDraft: (note: string) => void;
  readonly noteForOrder: (orderId: number) => string | null;
  /** Called once the order exists: moves the draft onto that order id. */
  readonly attachDraftToOrder: (orderId: number) => void;
}

export function useDeliveryNotes(): DeliveryNotesApi {
  const [notes, isReady] = store.use();

  return {
    draft: notes.draft,
    isReady,

    setDraft: (note) => {
      store.update((current) => ({
        ...current,
        draft: note.slice(0, MAX_NOTE_LENGTH),
      }));
    },

    noteForOrder: (orderId) => {
      const note = notes.byOrderId[String(orderId)];
      return note !== undefined && note.length > 0 ? note : null;
    },

    attachDraftToOrder: (orderId) => {
      store.update((current) => {
        const note = current.draft.trim();
        if (note.length === 0) return { ...current, draft: "" };
        return {
          draft: "",
          byOrderId: { ...current.byOrderId, [String(orderId)]: note },
        };
      });
    },
  };
}
