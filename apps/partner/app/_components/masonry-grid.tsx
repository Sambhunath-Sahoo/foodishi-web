"use client";

import * as React from "react";
import { cn } from "@repo/ui";

/**
 * The row unit the cells are counted in. Small, so a card's measured height
 * rounds up by at most a few pixels rather than leaving a visible hole.
 */
const ROW_UNIT_PX = 4;
/** The vertical gutter between stacked cards, folded into each cell's span. */
const GUTTER_PX = 12;

/**
 * The ticket grid: one column on a portrait tablet, two on a landscape one,
 * three on a desktop-width screen — and the cards in each column stacked at
 * their own height.
 *
 * A plain grid sized every row to its tallest ticket, so a one-dish order sat
 * beside a five-dish one with a 100px hole under it. CSS columns would close
 * the holes but flow tickets 1..n/2 down the first column, and the urgency
 * order has to read across the top. So this is a grid with tiny rows: each
 * cell measures its card and spans as many rows as it needs, and dense
 * auto-placement drops the next ticket into whichever column is shortest. The
 * DOM order is still the urgency order, so a screen reader and a keyboard walk
 * the same sequence the cook sees across the top row.
 */
export function MasonryGrid({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "grid grid-flow-row-dense grid-cols-1 items-start gap-x-3",
        "min-[900px]:grid-cols-2 min-[1440px]:grid-cols-3",
        className,
      )}
      style={{ gridAutoRows: `${ROW_UNIT_PX}px` }}
    >
      {React.Children.map(children, (child) =>
        child === null || child === undefined ? null : <MasonryCell>{child}</MasonryCell>,
      )}
    </div>
  );
}

function spanFor(heightPx: number): number {
  return Math.max(1, Math.ceil((heightPx + GUTTER_PX) / ROW_UNIT_PX));
}

function MasonryCell({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [span, setSpan] = React.useState<number | null>(null);

  // Layout effect, so the first paint already has every card at its own
  // height instead of a frame of tickets drawn on top of one another.
  React.useLayoutEffect(() => {
    const content = contentRef.current;
    if (content === null) return undefined;

    const measure = (): void => {
      setSpan(spanFor(content.getBoundingClientRect().height));
    };
    measure();

    // Lines load after the card mounts, and a note or an error banner can
    // appear later still — every one of those changes the card's height.
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={span === null ? undefined : { gridRowEnd: `span ${span}` }}>
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
