import * as React from "react";
import { cn } from "../lib/cn";

export interface PageTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  readonly subtitle?: string;
}

/**
 * The display serif appears here and nowhere else — never inside a table
 * (DESIGN.md, Type). Using this component is how that stays true.
 */
export function PageTitle({
  className,
  subtitle,
  children,
  ...props
}: PageTitleProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <h1
        className={cn(
          "font-title text-3xl leading-tight font-normal text-ink",
          className,
        )}
        {...props}
      >
        {children}
      </h1>
      {subtitle !== undefined ? (
        <p className="font-sans text-[13px] text-ink-3">{subtitle}</p>
      ) : null}
    </div>
  );
}
