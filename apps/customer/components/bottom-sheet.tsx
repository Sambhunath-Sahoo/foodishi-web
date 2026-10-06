"use client";

import * as React from "react";
import { cn } from "@repo/ui";
import { APP_COLUMN } from "../lib/app-column";

/**
 * A sheet that rises from the bottom of the phone column.
 *
 * A native <dialog> opened with showModal(): the browser supplies the focus
 * trap, Escape, the inert page behind it and the top layer, so none of that is
 * reimplemented here — and the customer app takes no dialog dependency of its
 * own (the shared Radix one is a centred desktop modal).
 *
 * Children mount only while it is open. A form inside it therefore does not
 * exist on the page until it is asked for, which is the point: the tracking
 * screen used to carry an open textarea mid-page on every order.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // A tap on the backdrop lands on the <dialog> itself, never on its panel.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        APP_COLUMN,
        // The UA stylesheet centres a modal with margin:auto and caps its size;
        // undo that so it sits on the bottom edge of the column.
        "m-0 mx-auto mt-auto max-h-[85dvh] p-0",
        "rounded-t-[16px] border border-b-0 border-line bg-surface text-ink shadow-card",
        "backdrop:bg-ink/40",
      )}
    >
      {open ? (
        // The home-indicator inset belongs to the PANEL, under everything in
        // it: on the scrolling body it sat at the end of the content, so a
        // sheet whose content scrolled, or that ever gains a footer, could put
        // its last control under the swipe bar. The body keeps its own 16px.
        <div className="flex max-h-[85dvh] flex-col pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
            <h2 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center rounded-card px-3 text-[14px] font-medium text-accent hover:bg-accent-soft"
            >
              Close
            </button>
          </div>
          <div className="overflow-y-auto px-4 pt-4 pb-4">
            {children}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
