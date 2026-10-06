import * as React from "react";
import { cn } from "@repo/ui";

/**
 * A standing fact about a board, written as text in the toolbar.
 *
 * These used to be `FilterChip`s with no value and no dismiss — "Every
 * kitchen", "Oldest first", "Approving does not publish". A chip is the shape of
 * a filter, so the reader went looking for the control, and the sentence that
 * actually explained it lived in a `title` tooltip that touch and keyboard users
 * cannot reach (SH-2). The explanation is now the visible text, at ink-3, which
 * clears 4.5:1 on the page ground in both themes.
 */
export function ToolbarHint({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <p className={cn("font-sans text-[12px] leading-snug text-ink-3", className)}>
      {children}
    </p>
  );
}
