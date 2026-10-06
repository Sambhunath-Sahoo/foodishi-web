"use client";

import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { cn } from "../lib/cn";

export const DialogRoot = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export interface DialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  /**
   * State the consequence before the tap. The description is where the real
   * number from the API goes: "Cancelling now costs Rs 105."
   */
  readonly description?: React.ReactNode;
  readonly children?: React.ReactNode;
  readonly footer?: React.ReactNode;
  /**
   * Extra classes for the panel, merged last. The customer app is a 480px phone
   * column on every screen, so it narrows the panel to sit inside that column
   * instead of the default 32rem, which is wider than the app itself.
   */
  readonly className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps): React.JSX.Element {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px]" />
        <RadixDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[min(32rem,calc(100vw-2rem))]",
            "-translate-x-1/2 -translate-y-1/2",
            "rounded-card border border-line bg-surface shadow-card",
            "focus-visible:outline-none",
            className,
          )}
        >
          <div className="border-b border-line px-5 py-4">
            <RadixDialog.Title className="font-sans text-base font-semibold text-ink">
              {title}
            </RadixDialog.Title>
            {description !== undefined ? (
              <RadixDialog.Description className="mt-1 text-[13px] text-ink-3">
                {description}
              </RadixDialog.Description>
            ) : null}
          </div>
          {children !== undefined ? (
            <div className="px-5 py-4 text-sm text-ink-2">{children}</div>
          ) : null}
          {footer !== undefined ? (
            <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
              {footer}
            </div>
          ) : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
