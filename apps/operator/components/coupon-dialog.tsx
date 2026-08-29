"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import {
  Button,
  Dialog,
  ErrorBanner,
  Field,
  Input,
  SegmentedControl,
  Select,
} from "@repo/ui";
import { formatMoney } from "../lib/format";
import {
  useCreateCoupon,
  useCuisines,
  useRestaurants,
  useUpdateCoupon,
} from "../lib/queries";
import type { CouponRead, CouponScope, DiscountType } from "../lib/api-types";
import type { CouponInput } from "../lib/services/types";

/** How long a new code runs for by default, in days. */
const DEFAULT_RUN_DAYS = 30;
const MS_PER_DAY = 86_400_000;

const TYPE_OPTIONS: readonly { value: DiscountType; label: string }[] = [
  { value: "flat", label: "Flat amount" },
  { value: "percent", label: "Percentage" },
];

const SCOPE_OPTIONS: readonly { value: CouponScope; label: string }[] = [
  { value: "global", label: "Whole platform" },
  { value: "restaurant", label: "One kitchen" },
  { value: "cuisine", label: "One cuisine" },
];

const NO_CAP = "";

/** An ISO instant as a `datetime-local` value, in the reader's own timezone. */
function toLocalInput(iso: string): string {
  const at = new Date(iso);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${String(at.getFullYear())}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/** …and back. A blank box keeps whatever was there rather than becoming 1970. */
function fromLocalInput(local: string, fallback: string): string {
  const parsed = Date.parse(local);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function blankCoupon(): CouponInput {
  const now = Date.now();
  return {
    code: "",
    description: "",
    discount_type: "flat",
    discount_value: "50.00",
    max_discount_amount: null,
    min_order_value: "299.00",
    scope: "global",
    restaurant_id: null,
    cuisine_id: null,
    valid_from: new Date(now).toISOString(),
    valid_until: new Date(now + DEFAULT_RUN_DAYS * MS_PER_DAY).toISOString(),
    usage_limit_total: 1000,
    usage_limit_per_user: 1,
  };
}

function toInput(coupon: CouponRead): CouponInput {
  return {
    code: coupon.code,
    description: coupon.description,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    max_discount_amount: coupon.max_discount_amount,
    min_order_value: coupon.min_order_value,
    scope: coupon.scope,
    restaurant_id: coupon.restaurant_id,
    cuisine_id: coupon.cuisine_id,
    valid_from: coupon.valid_from,
    valid_until: coupon.valid_until,
    usage_limit_total: coupon.usage_limit_total,
    usage_limit_per_user: coupon.usage_limit_per_user,
  };
}

export interface CouponDialogProps {
  readonly open: boolean;
  /** Null creates a new code; a coupon edits that one. */
  readonly coupon: CouponRead | null;
  readonly onClose: () => void;
}

/**
 * One form for creating a code and for editing one, because they are the same
 * decision made at different times.
 *
 * Nothing here re-checks the rules. `lib/services` refuses a percentage discount
 * with no cap, a window that ends before it starts and a flat discount worth
 * more than the minimum order it requires — each with the sentence that says what
 * to change — and this form shows that sentence. Two copies of those rules would
 * drift, and the copy in a form is the one that gets forgotten.
 *
 * What the form *does* own is the shape: which fields a percentage needs that a
 * flat amount does not, and which target a scope asks for. A field that cannot
 * apply is not disabled, it is absent.
 */
export function CouponDialog({
  open,
  coupon,
  onClose,
}: CouponDialogProps): React.JSX.Element {
  const restaurants = useRestaurants();
  const cuisines = useCuisines();
  const create = useCreateCoupon();
  const update = useUpdateCoupon();

  const [draft, setDraft] = React.useState<CouponInput>(blankCoupon);

  // Every open starts from what is being edited, or from a clean slate.
  React.useEffect(() => {
    if (!open) return;
    setDraft(coupon === null ? blankCoupon() : toInput(coupon));
    create.reset();
    update.reset();
    // The mutations' identities are stable; re-seeding on open is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, coupon?.id]);

  const patch = React.useCallback((next: Partial<CouponInput>) => {
    setDraft((current) => ({ ...current, ...next }));
  }, []);

  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const submit = React.useCallback(() => {
    if (coupon === null) {
      create.mutate(draft, { onSuccess: onClose });
      return;
    }
    update.mutate({ couponId: coupon.id, patch: draft }, { onSuccess: onClose });
  }, [coupon, create, draft, onClose, update]);

  const restaurantOptions = React.useMemo(
    () => [
      { value: "", label: "Choose a kitchen…" },
      ...[...(restaurants.data?.items ?? [])]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((row) => ({ value: String(row.id), label: row.name })),
    ],
    [restaurants.data],
  );

  const cuisineOptions = React.useMemo(
    () => [
      { value: "", label: "Choose a cuisine…" },
      ...(cuisines.data ?? []).map((row) => ({
        value: String(row.id),
        label: row.name,
      })),
    ],
    [cuisines.data],
  );

  const isPercent = draft.discount_type === "percent";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={coupon === null ? "New coupon" : `Edit ${coupon.code}`}
      description={
        coupon === null
          ? "A code a customer types at checkout. What it takes off, what it needs before it applies, and how many times it can be used."
          : `Used ${String(coupon.times_used)} times so far. Changing what it takes off does not change orders it has already been applied to.`
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            isPending={pending}
            pendingLabel={coupon === null ? "Creating…" : "Saving…"}
          >
            {coupon === null ? "Create the code" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        {error === null ? null : (
          <ErrorBanner
            title={coupon === null ? "The code was not created" : "The code was not saved"}
            message={toUserMessage(error)}
          />
        )}

        <Field
          label="Code"
          htmlFor="coupon-code"
          hint="Letters and digits only — customers type this by hand."
        >
          <Input
            id="coupon-code"
            mono
            autoFocus={coupon === null}
            value={draft.code}
            onChange={(event) => patch({ code: event.target.value.toUpperCase() })}
            placeholder="MONSOON30"
          />
        </Field>

        <Field
          label="What the customer sees"
          htmlFor="coupon-description"
          hint="One line, shown beside the code at checkout."
        >
          <Input
            id="coupon-description"
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value })}
            placeholder="₹50 off orders over ₹300"
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-[13px] font-medium text-ink-2">
            What it takes off
          </span>
          <SegmentedControl
            ariaLabel="Discount type"
            options={TYPE_OPTIONS}
            value={draft.discount_type}
            onValueChange={(next) =>
              patch({
                discount_type: next,
                // A percentage must have a cap; a flat amount must not.
                max_discount_amount: next === "percent" ? "120.00" : null,
                discount_value: next === "percent" ? "20" : "50.00",
              })
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={isPercent ? "Percentage off" : "Amount off"}
            htmlFor="coupon-value"
            hint={isPercent ? "Of the food value, before fees." : "Taken off the food value."}
          >
            <Input
              id="coupon-value"
              mono
              inputMode="decimal"
              value={draft.discount_value}
              onChange={(event) => patch({ discount_value: event.target.value })}
            />
          </Field>

          {isPercent ? (
            <Field
              label="Capped at"
              htmlFor="coupon-cap"
              hint="Required. Without a cap, the biggest order on the platform decides what this costs."
            >
              <Input
                id="coupon-cap"
                mono
                inputMode="decimal"
                value={draft.max_discount_amount ?? ""}
                onChange={(event) =>
                  patch({
                    max_discount_amount:
                      event.target.value === "" ? null : event.target.value,
                  })
                }
              />
            </Field>
          ) : null}

          <Field
            label="Minimum order"
            htmlFor="coupon-min"
            hint={
              isPercent
                ? "Below this the code does not apply."
                : `Has to be at least the discount, or the platform pays the customer to order. Currently ${formatMoney(draft.discount_value)} off.`
            }
          >
            <Input
              id="coupon-min"
              mono
              inputMode="decimal"
              value={draft.min_order_value}
              onChange={(event) => patch({ min_order_value: event.target.value })}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-[13px] font-medium text-ink-2">
            Where it applies
          </span>
          <SegmentedControl
            ariaLabel="Coupon scope"
            options={SCOPE_OPTIONS}
            value={draft.scope}
            onValueChange={(next) =>
              patch({ scope: next, restaurant_id: null, cuisine_id: null })
            }
          />
        </div>

        {draft.scope === "restaurant" ? (
          <Field label="Kitchen" htmlFor="coupon-restaurant" hint="Only this kitchen's orders.">
            <Select
              id="coupon-restaurant"
              options={restaurantOptions}
              value={draft.restaurant_id === null ? "" : String(draft.restaurant_id)}
              onChange={(event) =>
                patch({
                  restaurant_id:
                    event.target.value === ""
                      ? null
                      : Number.parseInt(event.target.value, 10),
                })
              }
            />
          </Field>
        ) : null}

        {draft.scope === "cuisine" ? (
          <Field label="Cuisine" htmlFor="coupon-cuisine" hint="Any kitchen serving it.">
            <Select
              id="coupon-cuisine"
              options={cuisineOptions}
              value={draft.cuisine_id === null ? "" : String(draft.cuisine_id)}
              onChange={(event) =>
                patch({
                  cuisine_id:
                    event.target.value === ""
                      ? null
                      : Number.parseInt(event.target.value, 10),
                })
              }
            />
          </Field>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Runs from" htmlFor="coupon-from" hint="Local time.">
            <Input
              id="coupon-from"
              type="datetime-local"
              mono
              value={toLocalInput(draft.valid_from)}
              onChange={(event) =>
                patch({
                  valid_from: fromLocalInput(event.target.value, draft.valid_from),
                })
              }
            />
          </Field>
          <Field label="Runs until" htmlFor="coupon-until" hint="After this it is refused.">
            <Input
              id="coupon-until"
              type="datetime-local"
              mono
              value={toLocalInput(draft.valid_until)}
              onChange={(event) =>
                patch({
                  valid_until: fromLocalInput(event.target.value, draft.valid_until),
                })
              }
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Total redemptions"
            htmlFor="coupon-cap-total"
            hint="Leave empty for no cap. A capped code is refused at checkout once it runs out."
          >
            <Input
              id="coupon-cap-total"
              mono
              type="number"
              min={1}
              value={
                draft.usage_limit_total === null ? NO_CAP : String(draft.usage_limit_total)
              }
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                patch({
                  usage_limit_total: Number.isFinite(parsed) ? parsed : null,
                });
              }}
            />
          </Field>
          <Field
            label="Per customer"
            htmlFor="coupon-cap-user"
            hint="How many times one account may use it."
          >
            <Input
              id="coupon-cap-user"
              mono
              type="number"
              min={1}
              value={String(draft.usage_limit_per_user)}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                patch({ usage_limit_per_user: Number.isFinite(parsed) ? parsed : 1 });
              }}
            />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
