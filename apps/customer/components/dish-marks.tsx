import * as React from "react";
import { cn } from "@repo/ui";
import type { SpiceLevel } from "../lib/types";

/**
 * The Indian veg mark: a square outline with a filled dot. It carries a text
 * label for screen readers, so the meaning never rests on colour alone
 * (DESIGN.md non-negotiable #3).
 */
export function VegMark({ isVeg }: { readonly isVeg: boolean }): React.JSX.Element {
  const tone = isVeg ? "border-ok" : "border-crit";
  const dot = isVeg ? "bg-ok" : "bg-crit";
  return (
    <span
      role="img"
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      title={isVeg ? "Vegetarian" : "Non-vegetarian"}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border-[1.5px]",
        tone,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-chip", dot)} />
    </span>
  );
}

/** none | mild | medium | hot, drawn as filled pips plus the word itself. */
const SPICE_PIPS: Record<SpiceLevel, number> = {
  none: 0,
  mild: 1,
  medium: 2,
  hot: 3,
};

const SPICE_LABEL: Record<SpiceLevel, string> = {
  none: "Not spiced",
  mild: "Mild",
  medium: "Medium",
  hot: "Hot",
};

export function SpiceMeter({
  level,
}: {
  readonly level: SpiceLevel;
}): React.JSX.Element | null {
  const pips = SPICE_PIPS[level] ?? 0;
  if (pips === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-ink-3">
      <span aria-hidden="true" className="inline-flex gap-0.5">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={cn(
              "size-1.5 rounded-chip",
              index < pips ? "bg-warn" : "bg-line-2",
            )}
          />
        ))}
      </span>
      {SPICE_LABEL[level] ?? level}
    </span>
  );
}
