"use client";

import * as React from "react";
import { BottomSheet } from "./bottom-sheet";
import { SupportContactCard } from "./support-contact-card";
import { SupportTicketForm } from "./support-ticket-form";
import { IS_TICKET_FORM_ENABLED } from "../lib/support-contact";

/**
 * Help for one order, in a sheet. Opened from the tracking screen's "Get help
 * with this order" and from the history list's "Get help" (as /orders/{id}#help).
 */
export function OrderHelpSheet({
  open,
  onClose,
  orderId,
  summary,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly orderId: number;
  /** One line on what went wrong, when the screen already knows. */
  readonly summary?: string;
}): React.JSX.Element {
  return (
    <BottomSheet open={open} onClose={onClose} title={`Help with order #${String(orderId)}`}>
      <div className="flex flex-col gap-4">
        {summary !== undefined ? (
          <p className="text-[14px] leading-snug text-ink-2">{summary}</p>
        ) : null}
        <SupportContactCard orderId={orderId} />
        {IS_TICKET_FORM_ENABLED ? (
          <SupportTicketForm
            orderId={orderId}
            defaultTopic="missing_item"
            title="Or describe it here"
          />
        ) : null}
      </div>
    </BottomSheet>
  );
}

/** The hash the history list links with to open this sheet on arrival. */
export const HELP_HASH = "#help";

/**
 * Open state for the sheet, seeded from `#help` so a "Get help" tap on the
 * orders list lands with the sheet already up. Read after mount: the hash is
 * never sent to the server, so the first render cannot know it.
 */
export function useHelpSheet(): {
  readonly isOpen: boolean;
  readonly open: () => void;
  readonly close: () => void;
} {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (window.location.hash === HELP_HASH) setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
    // Drop the hash so a reload or Back does not reopen what was dismissed.
    if (window.location.hash === HELP_HASH) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);
  const open = React.useCallback(() => setIsOpen(true), []);

  return { isOpen, open, close };
}
