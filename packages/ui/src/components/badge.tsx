import * as React from "react";
import { cn } from "../lib/cn";
import { TONE_DOT, TONE_SOFT, type Tone } from "../status/tone";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  readonly tone?: Tone;
  /**
   * Colour never carries meaning alone (DESIGN.md #3). The dot is on by
   * default; turn it off only for a badge that is decoration, not state.
   */
  readonly dot?: boolean;
}

export function Badge({
  className,
  tone = "mute",
  dot = true,
  children,
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5",
        "font-sans text-[12px] font-medium whitespace-nowrap",
        TONE_SOFT[tone],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-chip", TONE_DOT[tone])}
        />
      ) : null}
      {children}
    </span>
  );
}
