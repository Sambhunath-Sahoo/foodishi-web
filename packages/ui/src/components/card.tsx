import * as React from "react";
import { cn } from "../lib/cn";
import { TONE_STRIPE, type Tone } from "../status/tone";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds the severity stripe down the leading edge (DESIGN.md #3). */
  readonly stripe?: Tone;
}

export function Card({ className, stripe, ...props }: CardProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-line bg-surface shadow-card",
        stripe !== undefined && [
          "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-['']",
          TONE_STRIPE[stripe],
        ],
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-line px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>): React.JSX.Element {
  return (
    <h2
      className={cn("text-sm font-semibold text-ink", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): React.JSX.Element {
  return <p className={cn("text-[13px] text-ink-3", className)} {...props} />;
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("px-4 py-4", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-line px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}
