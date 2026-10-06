import * as React from "react";
import { SEVERITY_SOFT, SEVERITY_TEXT, cn } from "@repo/ui";
import type { Lateness } from "../_lib/lateness";

export interface LatenessChipProps {
  readonly late: Lateness;
  readonly className?: string;
}

/**
 * The graded lateness headline as a compact chip: "44d 20h late", "12m left".
 *
 * It used to be bare 15px mono in severity red, the loudest thing on the card
 * after the button. As a chip it is the same fact at a third of the visual
 * weight, and the dot plus the words keep the grade readable without colour
 * (DESIGN.md non-negotiable #3) — the card's severity stripe still carries it
 * down the edge.
 */
export function LatenessChip({ late, className }: LatenessChipProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-chip px-2",
        "font-mono text-[13px] leading-none tabular-nums whitespace-nowrap",
        SEVERITY_SOFT[late.tier],
        SEVERITY_TEXT[late.tier],
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-chip bg-current" />
      {late.headline}
    </span>
  );
}
