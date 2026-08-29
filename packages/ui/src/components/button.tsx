import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/**
 * The destructive button is outlined, not filled (DESIGN.md non-negotiable #5).
 * A kitchen tablet should not carry a red block next to the button tapped
 * forty times an hour.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-sans font-medium rounded-card border",
    "transition-colors cursor-pointer select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-on-accent border-accent hover:bg-accent-hover hover:border-accent-hover",
        ghost:
          "bg-transparent text-accent border-transparent hover:bg-accent-soft",
        outline:
          "bg-surface text-ink border-line-2 hover:bg-surface-2",
        danger:
          "bg-transparent text-crit border-crit hover:bg-crit-soft",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base w-full sm:w-auto",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Short text shown while an action is in flight. */
  readonly pendingLabel?: string;
  readonly isPending?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      block,
      isPending = false,
      pendingLabel,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-busy={isPending || undefined}
        disabled={disabled === true || isPending}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      >
        {isPending && pendingLabel !== undefined ? pendingLabel : children}
      </button>
    );
  },
);

export { buttonVariants };
