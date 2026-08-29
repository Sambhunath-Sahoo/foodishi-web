"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { Button, Dialog, Field, Input, Select } from "@repo/ui";
import { KIND_OPTIONS, fromDateTimeInput, toDateTimeInput } from "./discount-shape";
import { useSaveCoupon } from "../../lib/queries/offers";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { Coupon, OfferKind } from "../../lib/types";

const PRICE_STEP = "0.01";
const MAX_PERCENT = 90;
const CODE_PATTERN = "[A-Z0-9]{4,20}";

interface CouponForm {
  readonly code: string;
  readonly kind: OfferKind;
  readonly value: string;
  readonly maxDiscount: string;
  readonly minOrderValue: string;
  readonly usageLimit: string;
  readonly perUserLimit: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly isActive: boolean;
}

function toForm(coupon: Coupon | null): CouponForm {
  if (coupon === null) {
    return {
      code: "",
      kind: "percent",
      value: "10",
      maxDiscount: "100.00",
      minOrderValue: "299.00",
      usageLimit: "",
      perUserLimit: "1",
      startsAt: toDateTimeInput(new Date().toISOString()),
      endsAt: "",
      isActive: true,
    };
  }
  return {
    code: coupon.code,
    kind: coupon.kind,
    value: coupon.value,
    maxDiscount: coupon.max_discount ?? "",
    minOrderValue: coupon.min_order_value,
    usageLimit: coupon.usage_limit === null ? "" : String(coupon.usage_limit),
    perUserLimit: String(coupon.per_user_limit),
    startsAt: toDateTimeInput(coupon.starts_at),
    endsAt: toDateTimeInput(coupon.ends_at),
    isActive: coupon.is_active,
  };
}

/**
 * One coupon: a code somebody types, and the two limits that make a leaked code
 * survivable.
 *
 * The code is not editable once the coupon exists. Customers have it written
 * down, screenshotted and posted; renaming it silently breaks every one of them,
 * so the field is locked and says why. To change the code, switch this one off
 * and make another.
 */
export function CouponDialog({
  kitchen,
  coupon,
  onClose,
}: {
  readonly kitchen: ReadyKitchen;
  readonly coupon: Coupon | null;
  readonly onClose: () => void;
}): React.JSX.Element {
  const [form, setForm] = React.useState(() => toForm(coupon));
  const save = useSaveCoupon(kitchen);

  function set<TField extends keyof CouponForm>(
    field: TField,
    value: CouponForm[TField],
  ): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(): void {
    save.mutate(
      {
        couponId: coupon?.id ?? null,
        body: {
          code: form.code.trim().toUpperCase(),
          kind: form.kind,
          value: form.kind === "free_delivery" ? "0.00" : form.value.trim(),
          max_discount:
            form.kind === "percent" && form.maxDiscount.trim() !== ""
              ? form.maxDiscount.trim()
              : null,
          min_order_value: form.minOrderValue.trim(),
          usage_limit: form.usageLimit.trim() === "" ? null : Number(form.usageLimit),
          per_user_limit: Number(form.perUserLimit),
          starts_at: fromDateTimeInput(form.startsAt) ?? new Date().toISOString(),
          ends_at: fromDateTimeInput(form.endsAt),
          is_active: form.isActive,
        },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={coupon === null ? "Create a coupon" : `Edit ${coupon.code}`}
      description="A coupon has to be typed at checkout, which is why it carries limits an offer does not: a code that leaks needs a ceiling."
      footer={
        <>
          <Button variant="ghost" className="min-h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="coupon-form"
            className="min-h-11"
            isPending={save.isPending}
            pendingLabel="Saving…"
          >
            {coupon === null ? "Create coupon" : "Save coupon"}
          </Button>
        </>
      }
    >
      <form
        id="coupon-form"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field
          label="Code"
          htmlFor="coupon-code"
          hint={
            coupon === null
              ? "Capitals and digits, 4 to 20 characters. It has to survive being read out over a phone."
              : "A code cannot be changed once customers have it. Switch this coupon off and make another instead."
          }
        >
          <Input
            id="coupon-code"
            mono
            required
            readOnly={coupon !== null}
            disabled={coupon !== null}
            pattern={CODE_PATTERN}
            value={form.code}
            placeholder="TANDOOR20"
            onChange={(event) => set("code", event.target.value.toUpperCase())}
            className="min-h-11"
          />
        </Field>

        <div className="flex flex-wrap gap-4">
          <div className="min-w-[170px] flex-1">
            <Field label="Kind" htmlFor="coupon-kind">
              <Select
                id="coupon-kind"
                options={KIND_OPTIONS}
                value={form.kind}
                onChange={(event) => set("kind", event.target.value as OfferKind)}
                className="min-h-11"
              />
            </Field>
          </div>
          {form.kind !== "free_delivery" ? (
            <div className="min-w-[120px] flex-1">
              <Field
                label={form.kind === "percent" ? "Percent off" : "Rupees off"}
                htmlFor="coupon-value"
              >
                <Input
                  id="coupon-value"
                  type="number"
                  mono
                  required
                  min={form.kind === "percent" ? 1 : PRICE_STEP}
                  max={form.kind === "percent" ? MAX_PERCENT : undefined}
                  step={form.kind === "percent" ? 1 : PRICE_STEP}
                  value={form.value}
                  onChange={(event) => set("value", event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
          ) : null}
          {form.kind === "percent" ? (
            <div className="min-w-[130px] flex-1">
              <Field label="Never more than" htmlFor="coupon-cap">
                <Input
                  id="coupon-cap"
                  type="number"
                  mono
                  required
                  min={PRICE_STEP}
                  step={PRICE_STEP}
                  value={form.maxDiscount}
                  onChange={(event) => set("maxDiscount", event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="min-w-[140px] flex-1">
            <Field label="Minimum order" htmlFor="coupon-min">
              <Input
                id="coupon-min"
                type="number"
                mono
                required
                min={0}
                step={PRICE_STEP}
                value={form.minOrderValue}
                onChange={(event) => set("minOrderValue", event.target.value)}
                className="min-h-11"
              />
            </Field>
          </div>
          <div className="min-w-[130px] flex-1">
            <Field
              label="Total uses"
              htmlFor="coupon-usage"
              hint="Empty for unlimited."
            >
              <Input
                id="coupon-usage"
                type="number"
                mono
                min={1}
                step={1}
                value={form.usageLimit}
                onChange={(event) => set("usageLimit", event.target.value)}
                className="min-h-11"
              />
            </Field>
          </div>
          <div className="min-w-[130px] flex-1">
            <Field
              label="Per customer"
              htmlFor="coupon-per-user"
              hint="How many times one person may use it."
            >
              <Input
                id="coupon-per-user"
                type="number"
                mono
                required
                min={1}
                step={1}
                value={form.perUserLimit}
                onChange={(event) => set("perUserLimit", event.target.value)}
                className="min-h-11"
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="min-w-[190px] flex-1">
            <Field label="Starts" htmlFor="coupon-starts">
              <Input
                id="coupon-starts"
                type="datetime-local"
                mono
                required
                value={form.startsAt}
                onChange={(event) => set("startsAt", event.target.value)}
                className="min-h-11"
              />
            </Field>
          </div>
          <div className="min-w-[190px] flex-1">
            <Field
              label="Ends"
              htmlFor="coupon-ends"
              hint="Leave empty to run until switched off."
            >
              <Input
                id="coupon-ends"
                type="datetime-local"
                mono
                value={form.endsAt}
                onChange={(event) => set("endsAt", event.target.value)}
                className="min-h-11"
              />
            </Field>
          </div>
        </div>

        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => set("isActive", event.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          <span className="text-[14px] text-ink">
            Switched on
            <span className="ml-2 text-[12px] text-ink-3">
              Off stops it working immediately and keeps its numbers.
            </span>
          </span>
        </label>

        {save.error !== null ? (
          <p role="alert" className="text-[13px] leading-snug text-crit">
            {toUserMessage(save.error)}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
