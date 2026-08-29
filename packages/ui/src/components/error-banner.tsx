import * as React from "react";
import { cn } from "../lib/cn";
import { TONE_DOT, TONE_SOFT, type Tone } from "../status/tone";

export interface ErrorBannerProps {
  /**
   * The server's own `detail` string. The API writes these for humans —
   * "Order must be at least 599 to use this coupon" — so show it verbatim.
   * Never replace it with "Something went wrong".
   */
  readonly message: string;
  readonly title?: string;
  readonly tone?: Extract<Tone, "crit" | "warn">;
  readonly action?: React.ReactNode;
  readonly className?: string;
}

export function ErrorBanner({
  message,
  title,
  tone = "crit",
  action,
  className,
}: ErrorBannerProps): React.JSX.Element {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-card border px-4 py-3",
        TONE_SOFT[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("mt-1.5 size-2 shrink-0 rounded-chip", TONE_DOT[tone])}
      />
      <div className="flex-1 font-sans text-[13px]">
        {title !== undefined ? (
          <p className="font-semibold">{title}</p>
        ) : null}
        <p className={cn(title !== undefined && "mt-0.5")}>{message}</p>
      </div>
      {action !== undefined ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
