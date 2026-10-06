"use client";

import * as React from "react";
import { cn } from "@repo/ui";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusableWithin(root: HTMLElement): readonly HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

export interface SheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: React.ReactNode;
  readonly subtitle?: React.ReactNode;
  readonly children: React.ReactNode;
  /**
   * Pinned under the scrolling body: the panel's actions. Kept outside the
   * scroller so the decision is on screen however far down the reader is —
   * an action at the bottom of a 2,000px drawer is an action nobody finds.
   */
  readonly footer?: React.ReactNode;
}

/**
 * A right-edge drawer.
 *
 * Hand-rolled rather than pulled from Radix: @radix-ui/react-dialog is a
 * dependency of @repo/ui and is not resolvable from this app, and adding it
 * here would mean touching the shared lockfile while other apps are being
 * built against it. Everything the dialog contract requires is implemented
 * below — labelled role="dialog", aria-modal, Escape to dismiss, a Tab loop
 * inside the panel, focus restored to whatever opened it, and the page behind
 * locked from scrolling.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: SheetProps): React.JSX.Element | null {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const titleId = React.useId();
  const openerRef = React.useRef<HTMLElement | null>(null);

  // Remember who opened it, move focus in, and put focus back on close.
  React.useEffect(() => {
    if (!open) return undefined;

    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const panel = panelRef.current;
    const first = panel === null ? undefined : focusableWithin(panel)[0];
    (first ?? panel)?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
      openerRef.current?.focus();
    };
  }, [open]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (panel === null) return;

      const focusable = focusableWithin(panel);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) {
        event.preventDefault();
        panel.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (!open) return null;

  // z-40, one below the shared Dialog's content (z-50) and level with its
  // overlay, which portals in later and so paints over this. A confirmation
  // opened from the drawer — reassign, cancel — then dims the drawer behind it
  // instead of floating half over an undimmed panel. Still above the sticky
  // header at z-30.
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close this panel"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/40 backdrop-blur-[1px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          "sheet-panel relative flex h-full w-[min(34rem,100vw)] flex-col",
          "border-l border-line bg-surface shadow-card",
          "focus-visible:outline-none",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-sans text-base leading-tight font-semibold text-ink"
            >
              {title}
            </h2>
            {subtitle !== undefined ? (
              <div className="mt-0.5 font-mono text-[11px] text-ink-3">{subtitle}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "shrink-0 rounded-card border border-line-2 px-2 py-1",
              "font-sans text-[12px] text-ink-2 hover:bg-surface-2",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer === undefined ? null : (
          <div className="shrink-0 border-t border-line bg-surface px-4 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
