"use client";

import * as React from "react";
import { cn } from "@repo/ui";
import { ABOVE_TAB_BAR, APP_COLUMN, APP_COLUMN_EDGE } from "../lib/app-column";

/**
 * The thumb-reachable bar above the tab bar: View cart on a menu, Add on a
 * dish, Checkout on the cart, Place order on checkout.
 *
 * One component because the four copies drifted. Each was `fixed inset-x-0
 * bottom-[56px]`, and one of them forgot the phone column, so on a desktop
 * browser the cart's bar ran the full 1280px under a 480px app. Here the
 * column, its hairline edge and the offset above the tab bar are fixed once.
 *
 * It also leaves a spacer of its own measured height in the page flow. The
 * pages used to guess with `pb-24`, and a bar that grew a second line (the
 * minimum-order note on the cart) covered the very reason it was disabled.
 */
export function StickyActionBar({
  children,
  className,
  label,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
  /** Names the region for a screen reader: "Your cart", "Place the order". */
  readonly label: string;
}): React.JSX.Element {
  const barRef = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState(0);

  React.useEffect(() => {
    const bar = barRef.current;
    if (bar === null) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setHeight(entry.borderBoxSize[0]?.blockSize ?? 0);
    });
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div aria-hidden="true" style={{ height }} />
      <div
        ref={barRef}
        role="region"
        aria-label={label}
        data-sticky-action-bar=""
        className={cn(
          APP_COLUMN,
          APP_COLUMN_EDGE,
          ABOVE_TAB_BAR,
          "fixed inset-x-0 z-20 border-t border-line bg-surface px-4 py-3 shadow-card",
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
