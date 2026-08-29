import * as React from "react";
import { cn } from "../lib/cn";

export interface EmptyStateProps {
  /**
   * Say what would appear here (DESIGN.md copy rules). "No breached refunds"
   * beats "No data".
   */
  readonly title: string;
  readonly detail?: string;
  readonly action?: React.ReactNode;
  readonly className?: string;
}

export function EmptyState({
  title,
  detail,
  action,
  className,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      <p className="font-sans text-sm font-semibold text-ink-2">{title}</p>
      {detail !== undefined ? (
        <p className="max-w-prose text-[13px] text-ink-3">{detail}</p>
      ) : null}
      {action !== undefined ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
