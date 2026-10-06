import * as React from "react";
import Link from "next/link";
import { buttonVariants, cn } from "@repo/ui";
import { formatMoneyShort } from "../lib/format";
import type { MinimumOrderGap as Gap } from "../lib/minimum-order";

const PERCENT = 100;

/**
 * The cart's bar while it is under the kitchen's minimum: what is missing, how
 * close it is, and the way to fix it. "Add items" goes back to the menu, which
 * is the only thing that can close the gap — a disabled Checkout here would be
 * a button that can only be read, not pressed.
 *
 * The bar is the accent, not a warning: being ₹3 short is a step, not a fault,
 * and the words carry the meaning on their own (DESIGN.md #3).
 */
export function MinimumOrderGap({
  gap,
  kitchenName,
  menuHref,
}: {
  readonly gap: Gap;
  readonly kitchenName: string;
  readonly menuHref: string;
}): React.JSX.Element {
  const percent = Math.round(gap.progress * PERCENT);

  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-[13px] leading-snug text-ink">
          Add{" "}
          <span className="font-semibold tabular-nums">
            {formatMoneyShort(gap.shortBy)}
          </span>{" "}
          more to order from {kitchenName}
        </p>
        <div
          role="progressbar"
          aria-label={`Towards the ${formatMoneyShort(gap.minimum)} minimum order`}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={PERCENT}
          aria-valuetext={`${formatMoneyShort(gap.subtotal)} of ${formatMoneyShort(gap.minimum)}`}
          className="h-1.5 w-full overflow-hidden rounded-chip bg-surface-2"
        >
          <div className="h-full rounded-chip bg-accent" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-[11px] tabular-nums text-ink-3">
          {formatMoneyShort(gap.subtotal)} of the {formatMoneyShort(gap.minimum)} minimum
        </p>
      </div>
      <Link
        href={menuHref}
        className={cn(buttonVariants({ size: "lg" }), "w-auto shrink-0 no-underline")}
      >
        Add items
      </Link>
    </div>
  );
}
