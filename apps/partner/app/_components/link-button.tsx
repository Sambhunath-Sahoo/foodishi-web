import * as React from "react";
import Link from "next/link";
import { buttonVariants, cn } from "@repo/ui";
import type { ButtonProps } from "@repo/ui";

export interface LinkButtonProps
  extends Pick<ButtonProps, "variant" | "size" | "block"> {
  readonly href: string;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly title?: string;
}

/**
 * A link that looks like a button.
 *
 * `Button` renders a `<button>` and takes no `asChild`, and wrapping a `Link`
 * in one gives a control that does not open in a new tab, does not show its
 * destination on hover and is announced as a button when it is a link. So the
 * variant classes are borrowed and the element stays an anchor.
 *
 * `min-h-11` is on by default because every one of these is on a tablet.
 */
export function LinkButton({
  href,
  children,
  variant = "outline",
  size = "md",
  block,
  className,
  title,
}: LinkButtonProps): React.JSX.Element {
  return (
    <Link
      href={href}
      title={title}
      className={cn(buttonVariants({ variant, size, block }), "min-h-11", className)}
    >
      {children}
    </Link>
  );
}
