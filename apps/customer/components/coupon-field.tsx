"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Button, ErrorBanner, Input, cn } from "@repo/ui";
import { toUserMessage } from "@repo/api-client";
import { useValidateCoupon } from "../lib/queries/coupons";
import { toLoginHref } from "../lib/next-path";
import { formatMoney, toNumber } from "../lib/format";

/**
 * Coupons are checked by POST /coupons/validate before they are applied, so a
 * refusal arrives as a written reason — "Order must be at least 599.00 to use
 * this coupon" — and that sentence is shown exactly as the server wrote it.
 * Never "Invalid coupon".
 *
 * Applying a code takes two round trips: validate says whether it may be used,
 * then the re-quote says what it is actually worth. A code that has been
 * accepted shows as accepted straight away rather than leaving the field
 * looking untouched until the second answer lands.
 */
export function CouponField({
  appliedCode,
  restaurantId,
  userId,
  subtotal,
  /** The quote's own note when a code was sent but could not be applied. */
  quoteMessage,
  discountAmount,
  onApply,
  onRemove,
}: {
  readonly appliedCode: string | null;
  readonly restaurantId: number;
  readonly userId: number | null;
  readonly subtotal: string;
  readonly quoteMessage?: string | null;
  readonly discountAmount?: string;
  readonly onApply: (code: string) => void;
  readonly onRemove: () => void;
}): React.JSX.Element {
  const [code, setCode] = React.useState("");
  const validate = useValidateCoupon();

  const refusal = validate.data?.applicable === false ? validate.data.reason : null;

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed === "" || userId === null) return;

    validate.mutate(
      { code: trimmed, restaurantId, userId, subtotal },
      {
        onSuccess: (result) => {
          // Only a coupon the server says is applicable goes into the cart —
          // otherwise the quote would just refuse it a second time.
          if (result.applicable) {
            onApply(trimmed);
            setCode("");
          }
        },
      },
    );
  }

  if (appliedCode !== null) {
    const discount = toNumber(discountAmount);
    const wasRefusedByQuote =
      quoteMessage !== null && quoteMessage !== undefined && quoteMessage !== "";

    return (
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-card border px-3 py-2.5",
            discount > 0
              ? "border-ok/25 bg-ok-soft"
              : wasRefusedByQuote
                ? "border-warn/25 bg-warn-soft"
                : "border-line bg-surface-2",
          )}
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <Badge
              tone={discount > 0 ? "ok" : wasRefusedByQuote ? "warn" : "mute"}
              className="w-fit font-mono"
            >
              {appliedCode}
            </Badge>
            <span className="text-[12px] text-ink-2">
              {discount > 0
                ? `${formatMoney(discountAmount)} off this order`
                : wasRefusedByQuote
                  ? "Not applied to this order"
                  : "Working out what this is worth…"}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </div>

        {/* The quote's own sentence, verbatim. */}
        {wasRefusedByQuote ? (
          <ErrorBanner tone="warn" title="Coupon not applied" message={quoteMessage} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit} className="flex items-start gap-2">
        <div className="flex-1">
          <label htmlFor="coupon-code" className="sr-only">
            Coupon code
          </label>
          <Input
            id="coupon-code"
            mono
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="Coupon code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="uppercase"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={code.trim() === "" || userId === null}
          isPending={validate.isPending}
          pendingLabel="Checking…"
        >
          Apply
        </Button>
      </form>

      {userId === null ? (
        <p className="text-[12px] text-ink-3">
          Coupons are checked against your account —{" "}
          <Link href={toLoginHref("/cart")} className="font-medium text-accent no-underline">
            sign in
          </Link>{" "}
          to use one. Your cart stays as it is.
        </p>
      ) : null}

      {/* The server's sentence, verbatim. */}
      {refusal !== null && refusal !== undefined ? (
        <ErrorBanner tone="warn" title="Coupon not applied" message={refusal} />
      ) : null}

      {validate.isError ? (
        <ErrorBanner
          tone="warn"
          title="Coupon not applied"
          message={toUserMessage(validate.error)}
        />
      ) : null}
    </div>
  );
}
