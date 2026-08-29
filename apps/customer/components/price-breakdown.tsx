import * as React from "react";
import { Skeleton, cn } from "@repo/ui";
import { formatDistance, formatMoney, toNumber } from "../lib/format";
import type { Quote } from "../lib/types";

/**
 * One priced row. Money is right-aligned with tabular figures so the column of
 * digits lines up (DESIGN.md, Type).
 */
function Row({
  label,
  note,
  amount,
  tone = "normal",
}: {
  readonly label: string;
  readonly note?: string;
  readonly amount: string;
  readonly tone?: "normal" | "free" | "discount" | "total";
}): React.JSX.Element {
  const isTotal = tone === "total";
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-1.5",
        isTotal && "border-t border-line pt-3 mt-1",
      )}
    >
      <span
        className={cn(
          "text-[13px] text-ink-2",
          isTotal && "text-sm font-semibold text-ink",
        )}
      >
        {label}
        {note !== undefined ? (
          <span className="ml-1.5 font-mono text-[11px] text-ink-3">{note}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "shrink-0 text-right text-[13px] tabular-nums text-ink",
          tone === "free" && "text-ok",
          tone === "discount" && "text-ok",
          isTotal && "text-base font-semibold",
        )}
      >
        {amount}
      </span>
    </div>
  );
}

export function PriceBreakdownSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} className="h-5 w-full" label="Pricing your cart" />
      ))}
      <Skeleton className="mt-2 h-7 w-full" label="Pricing your cart" />
    </div>
  );
}

/**
 * The live breakdown from POST /orders/quote. Every number here is the
 * server's — nothing on this screen is added up in the browser, which is the
 * whole reason the quote endpoint exists: this price is the price charged.
 */
export function PriceBreakdown({
  quote,
  isRefreshing = false,
}: {
  readonly quote: Quote;
  readonly isRefreshing?: boolean;
}): React.JSX.Element {
  const deliveryFee = toNumber(quote.delivery_fee);
  const discount = toNumber(quote.discount_amount);

  return (
    <div
      aria-busy={isRefreshing || undefined}
      className={cn("transition-opacity", isRefreshing && "opacity-60")}
    >
      <Row label="Item subtotal" amount={formatMoney(quote.subtotal)} />
      <Row label="Packaging" amount={formatMoney(quote.packaging_fee)} />
      <Row
        label="Delivery"
        note={formatDistance(quote.distance_km)}
        amount={deliveryFee === 0 ? "Free" : formatMoney(quote.delivery_fee)}
        tone={deliveryFee === 0 ? "free" : "normal"}
      />
      <Row label="GST (5%)" amount={formatMoney(quote.tax_amount)} />
      {discount > 0 ? (
        <Row
          label={
            quote.coupon_code !== null && quote.coupon_code !== undefined
              ? `Discount · ${quote.coupon_code}`
              : "Discount"
          }
          amount={`− ${formatMoney(quote.discount_amount)}`}
          tone="discount"
        />
      ) : null}
      <Row label="To pay" amount={formatMoney(quote.total_amount)} tone="total" />
    </div>
  );
}
