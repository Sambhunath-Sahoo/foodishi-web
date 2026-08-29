import * as React from "react";
import type { Tone } from "../status/tone";
import { getOrderStatusPresentation } from "../status/order-status";
import { formatInr } from "./money";

export interface ChipProps {
  readonly tone: Tone;
  readonly children: React.ReactNode;
  /** Larger chip for the partner tablet, read at two feet. */
  readonly large?: boolean;
}

/** A chip always carries its dot — colour never carries meaning alone (#3). */
export function Chip({
  tone,
  children,
  large = false,
}: ChipProps): React.JSX.Element {
  return (
    <span className={large ? "tp-chip tp-chip--lg" : "tp-chip"} data-tone={tone}>
      <span className="tp-chip__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

/** The one place a story turns an API status string into a chip. */
export function OrderChip({
  status,
  large = false,
}: {
  readonly status: string;
  readonly large?: boolean;
}): React.JSX.Element {
  const { tone, label } = getOrderStatusPresentation(status);
  return (
    <Chip tone={tone} large={large}>
      {label}
    </Chip>
  );
}

/** Money is right-aligned with tabular figures, everywhere, no exceptions. */
export function Money({
  amount,
}: {
  readonly amount: number;
}): React.JSX.Element {
  return <span className="tp-num">{formatInr(amount)}</span>;
}
