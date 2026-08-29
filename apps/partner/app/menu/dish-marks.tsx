import * as React from "react";
import { cn } from "@repo/ui";
import type { MenuItem } from "../../lib/types";

const SPICE_LABELS: Record<string, string> = {
  mild: "Mild",
  medium: "Medium",
  hot: "Hot",
};

/**
 * Diet and heat, in a line that fits under the dish name. The dot carries the
 * diet for anyone who can see the hue, and the word carries it for everyone
 * else — colour is never the only signal.
 */
export function DishMarks({ item }: { readonly item: MenuItem }): React.JSX.Element {
  const spice = SPICE_LABELS[item.spice_level];

  return (
    <span className="flex items-center gap-1.5 text-[11px] leading-none text-ink-3">
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-chip", item.is_veg ? "bg-ok" : "bg-crit")}
      />
      <span>{item.is_veg ? "Veg" : "Non-veg"}</span>
      {spice !== undefined ? (
        <>
          <span aria-hidden="true" className="text-ink-4">
            ·
          </span>
          <span>{spice}</span>
        </>
      ) : null}
    </span>
  );
}
