import * as React from "react";
import { cn } from "../lib/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Describe what is loading, for screen readers. */
  readonly label?: string;
}

export function Skeleton({
  className,
  label = "Loading",
  ...props
}: SkeletonProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "animate-pulse rounded-card bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

/** A placeholder shaped like a table while rows are in flight. */
export function SkeletonRows({
  rows = 5,
  className,
}: {
  readonly rows?: number;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <div className={cn("flex flex-col gap-2 p-3", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-7 w-full" label="Loading rows" />
      ))}
    </div>
  );
}
