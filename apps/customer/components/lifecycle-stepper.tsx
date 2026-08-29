"use client";

import * as React from "react";
import { cn } from "@repo/ui";
import { LIFECYCLE, lifecycleIndex } from "../lib/lifecycle";

/**
 * Where the order is on the line. The step is marked with a tick, a ring or a
 * hollow dot as well as a colour, so the state never rests on colour alone
 * (DESIGN.md non-negotiable #3).
 */
export function LifecycleStepper({
  status,
}: {
  readonly status: string;
}): React.JSX.Element {
  const current = lifecycleIndex(status);

  return (
    <ol aria-label="Order progress" className="flex items-start">
      {LIFECYCLE.map((step, index) => {
        const isDone = current > index;
        const isCurrent = current === index;
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
                  !isDone && !isCurrent && "border-line-2 bg-surface text-ink-4",
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
                isCurrent ? "font-semibold text-ink" : isDone ? "text-ink-2" : "text-ink-4",
              )}
            >
              {step.label}
            </span>
            <span className="sr-only">
              {isDone ? "done" : isCurrent ? "in progress" : "not started"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
