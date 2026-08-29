import * as React from "react";

/**
 * Which half of sign-up this is.
 *
 * Present because the two halves look alike — both are a card with a form and a
 * button — and the first one was mistaken for the whole thing: an account was
 * created, the confirm-email wall came up, and the person reasonably believed
 * they had applied. Nothing had reached the operator's queue.
 *
 * Quiet on purpose. It is orientation, not a heading, and it must not compete
 * with the field labels somebody is actually filling in.
 */
export function StepLabel({
  step,
  of,
  children,
}: {
  readonly step: number;
  readonly of: number;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <p className="flex items-baseline gap-2 border-b border-line pb-2 text-[12px] text-ink-3">
      <span className="font-mono tabular-nums text-ink-2">
        Step {step} of {of}
      </span>
      <span aria-hidden="true">·</span>
      <span>{children}</span>
    </p>
  );
}
