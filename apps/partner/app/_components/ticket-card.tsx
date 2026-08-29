"use client";

import * as React from "react";
import { Card, SEVERITY_STRIPE, cn, type SeverityTier } from "@repo/ui";

export interface TicketCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** From `readLateness(...).tier`. Tier 0 draws no rule. */
  readonly tier: SeverityTier;
}

/**
 * A ticket card wearing the graded severity rule.
 *
 * `Card`'s own `stripe` prop takes a `Tone`, which has no tier-2 burnt and
 * would flatten "12h late" back into the same red as "3m late". So the rule is
 * drawn here from `SEVERITY_STRIPE`: 3px, inset vertically, never a full
 * border and never a background wash (DENSITY.md §3). Tier 0 draws nothing —
 * a rule down every card is decoration, not a signal.
 */
export function TicketCard({
  tier,
  className,
  ...props
}: TicketCardProps): React.JSX.Element {
  return (
    <Card
      className={cn(
        tier !== 0 && [
          "before:absolute before:inset-y-[6px] before:left-0 before:z-10",
          "before:w-[3px] before:rounded-[2px] before:content-['']",
          SEVERITY_STRIPE[tier],
        ],
        className,
      )}
      {...props}
    />
  );
}
