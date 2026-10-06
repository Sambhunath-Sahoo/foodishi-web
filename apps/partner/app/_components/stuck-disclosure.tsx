"use client";

import * as React from "react";

/** The one label every screen gives its stuck tickets, so none spells it two ways. */
export function stuckLabel(count: number): string {
  return `Stuck — over 6 h past promise (${String(count)})`;
}

export interface StuckDisclosureProps {
  readonly count: number;
  /** What somebody should do about them, which differs by screen. */
  readonly hint: string;
  /** Rendered only once opened. */
  readonly children: React.ReactNode;
}

/**
 * Tickets more than six hours past their promise, closed by default.
 *
 * Shared by the live list and Pickups so the two can never disagree about what
 * "stuck" looks like. Its rows are not even mounted until it is opened: a queue
 * card reads its own order lines, and a request per ticket nobody is cooking is
 * the wrong thing to spend a kitchen's connection on.
 */
export function StuckDisclosure({
  count,
  hint,
  children,
}: StuckDisclosureProps): React.JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <details
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className="group flex flex-col gap-3"
    >
      {/* The bar is the frame, not a box around the rows: framed, a stuck
          card would be 26px narrower than the same card in the queue. */}
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-card border border-line bg-surface-2 px-4 py-2 hover:bg-surface [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="inline-block w-3 font-mono text-[14px] text-ink-3 transition-transform group-open:rotate-90"
        >
          ›
        </span>
        <span className="flex flex-col">
          <span className="text-[15px] font-semibold text-ink">{stuckLabel(count)}</span>
          <span className="text-[13px] leading-snug text-ink-3">{hint}</span>
        </span>
      </summary>

      {isOpen ? children : null}
    </details>
  );
}
