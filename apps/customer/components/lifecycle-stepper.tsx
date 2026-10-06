"use client";

import * as React from "react";
import { cn } from "@repo/ui";
import { LIFECYCLE, lifecycleIndex } from "../lib/lifecycle";
import { formatTimeOnly } from "../lib/format";

const DELIVERED_INDEX = LIFECYCLE.length - 1;

/**
 * Where the order is on the line. The step is marked with a tick, a ring or a
 * hollow dot as well as a colour, so the state never rests on colour alone
 * (DESIGN.md non-negotiable #3).
 */
export function LifecycleStepper({
  status,
  deliveredAt = null,
}: {
  readonly status: string;
  /** Printed under "Delivered" once it is; the same time the trail shows. */
  readonly deliveredAt?: string | null;
}): React.JSX.Element {
  const current = lifecycleIndex(status);
  // Delivered is the end of the line, not a step being worked on. Read as the
  // "current" step it drew the open ring and told a screen reader "Delivered,
  // in progress" over a dinner already eaten — so the last step, once
  // reached, is done like every step before it.
  const isComplete = current === DELIVERED_INDEX;

  return (
    <ol aria-label="Order progress" className="flex items-start">
      {LIFECYCLE.map((step, index) => {
        const isDone = current > index || (isComplete && index === DELIVERED_INDEX);
        const isCurrent = current === index && !isDone;
        // The step the order stands on keeps the weight, ticked or not.
        const isHere = current === index;
        const isLast = index === LIFECYCLE.length - 1;

        return (
          <li key={step.status} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "h-0.5 flex-1",
                  index === 0 ? "bg-transparent" : isDone || isCurrent ? "bg-accent" : "bg-line-2",
                )}
              />
              {/* The glyph is decoration: the sr-only line below says the
                  state in words, so a screen reader hears "Cooking, in
                  progress" rather than a bullet character. */}
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-chip border-2 text-[10px] leading-none",
                  isDone && "border-accent bg-accent text-on-accent",
                  isCurrent && "border-accent bg-surface text-accent",
                  !isDone && !isCurrent && "border-line-2 bg-surface text-ink-3",
                )}
              >
                {isDone ? "✓" : isCurrent ? "●" : ""}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "h-0.5 flex-1",
                  isLast ? "bg-transparent" : isDone ? "bg-accent" : "bg-line-2",
                )}
              />
            </div>
            <span
              className={cn(
                "mt-1.5 px-0.5 text-center text-[11px] leading-tight",
                isHere ? "font-semibold text-ink" : isDone ? "text-ink-2" : "text-ink-3",
              )}
            >
              {step.label}
            </span>
            {isComplete && index === DELIVERED_INDEX && deliveredAt !== null ? (
              <span className="mt-0.5 font-mono text-[11px] leading-tight tabular-nums text-ink-3">
                {formatTimeOnly(deliveredAt)}
              </span>
            ) : null}
            <span className="sr-only">
              {isDone ? "done" : isCurrent ? "in progress" : "not started"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
