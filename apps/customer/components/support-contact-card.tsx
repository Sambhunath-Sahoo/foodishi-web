import * as React from "react";
import { buttonVariants, cn } from "@repo/ui";
import { SUPPORT_CONTACT } from "../lib/support-contact";

/**
 * Call or write to a person. Two full-width rows rather than a sentence with
 * links in it, because on a phone the number IS the action: a tap dials.
 *
 * `orderId` goes into the mail subject so the first reply does not have to
 * ask which order.
 */
export function SupportContactCard({
  orderId = null,
}: {
  readonly orderId?: number | null;
}): React.JSX.Element {
  const subject =
    orderId === null ? "Help with Foodishi" : `Help with order #${String(orderId)}`;
  const mailHref = `mailto:${SUPPORT_CONTACT.email}?subject=${encodeURIComponent(subject)}`;

  return (
    <div className="flex flex-col gap-2">
      {SUPPORT_CONTACT.phone !== null ? (
        <a
          href={`tel:${SUPPORT_CONTACT.phone}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg", block: true }),
            "h-auto min-h-12 justify-between py-2 no-underline sm:w-full",
          )}
        >
          <span className="text-[15px] font-medium text-ink">Call support</span>
          <span className="font-mono text-[13px] tabular-nums text-ink-2">
            {SUPPORT_CONTACT.phoneLabel}
          </span>
        </a>
      ) : null}
      <a
        href={mailHref}
        className={cn(
          buttonVariants({ variant: "outline", size: "lg", block: true }),
          "h-auto min-h-12 justify-between py-2 no-underline sm:w-full",
        )}
      >
        <span className="text-[15px] font-medium text-ink">Email support</span>
        <span className="min-w-0 truncate font-mono text-[13px] text-ink-2">
          {SUPPORT_CONTACT.email}
        </span>
      </a>
      {SUPPORT_CONTACT.hours !== null ? (
        <p className="text-[12px] text-ink-3">{SUPPORT_CONTACT.hours}</p>
      ) : null}
    </div>
  );
}
