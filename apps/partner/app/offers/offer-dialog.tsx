"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { Button, Dialog, Field, Input, Select } from "@repo/ui";
import {
  KIND_OPTIONS,
  fromDateTimeInput,
  toDateTimeInput,
} from "./discount-shape";
import { useSaveOffer } from "../../lib/queries/offers";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { MenuCategory, Offer, OfferKind } from "../../lib/types";

const TITLE_MIN = 4;
const PRICE_STEP = "0.01";
const MAX_PERCENT = 90;

interface OfferForm {
  readonly title: string;
  readonly description: string;
  readonly kind: OfferKind;
  readonly value: string;
  readonly maxDiscount: string;
  readonly minOrderValue: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly isActive: boolean;
  /** Empty means the whole menu. */
  readonly menuItemIds: readonly number[];
}

function toForm(offer: Offer | null): OfferForm {
  if (offer === null) {
    const now = new Date();
    return {
      title: "",
      description: "",
      kind: "percent",
      value: "10",
      maxDiscount: "100.00",
      minOrderValue: "299.00",
      startsAt: toDateTimeInput(now.toISOString()),
      endsAt: "",
      isActive: true,
      menuItemIds: [],
    };
  }
  return {
    title: offer.title,
    description: offer.description ?? "",
    kind: offer.kind,
    value: offer.value,
    maxDiscount: offer.max_discount ?? "",
    minOrderValue: offer.min_order_value,
    startsAt: toDateTimeInput(offer.starts_at),
    endsAt: toDateTimeInput(offer.ends_at),
    isActive: offer.is_active,
    menuItemIds: offer.menu_item_ids ?? [],
  };
}

/**
 * One offer: what it takes off, what it takes off of, and when.
 *
 * A percentage is made to carry a cap — the source refuses one without — because
 * "20% off" on a ₹4,000 party order is ₹800 out of a margin nobody agreed to.
 * The cap field appears only for a percentage, so a flat ₹75 offer never asks a
 * question with no meaning.
 */
export function OfferDialog({
  kitchen,
  categories,
  offer,
  onClose,
}: {
  readonly kitchen: ReadyKitchen;
  readonly categories: readonly MenuCategory[];
  /** null creates; an offer edits it. */
  readonly offer: Offer | null;
  readonly onClose: () => void;
}): React.JSX.Element {
  const [form, setForm] = React.useState(() => toForm(offer));
  const save = useSaveOffer(kitchen);

  const dishes = categories.flatMap((category) =>
    category.items.map((item) => ({ item, categoryName: category.name })),
  );

  function set<TField extends keyof OfferForm>(
    field: TField,
    value: OfferForm[TField],
  ): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleDish(itemId: number): void {
    setForm((current) => ({
      ...current,
      menuItemIds: current.menuItemIds.includes(itemId)
        ? current.menuItemIds.filter((id) => id !== itemId)
        : [...current.menuItemIds, itemId],
    }));
  }

  function submit(): void {
    save.mutate(
      {
        offerId: offer?.id ?? null,
        body: {
          title: form.title.trim(),
          description: form.description.trim() === "" ? null : form.description.trim(),
          kind: form.kind,
          value: form.kind === "free_delivery" ? "0.00" : form.value.trim(),
          // Only a percentage has a cap. Sending one for a flat amount would
          // store a number nothing reads.
          max_discount:
            form.kind === "percent" && form.maxDiscount.trim() !== ""
              ? form.maxDiscount.trim()
              : null,
          min_order_value: form.minOrderValue.trim(),
          menu_item_ids: form.menuItemIds.length === 0 ? null : form.menuItemIds,
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
      title={offer === null ? "Create an offer" : `Edit ${offer.title}`}
      description="An offer applies itself — a customer sees it on this restaurant and gets it without typing anything."
      footer={
        <>
          <Button variant="ghost" className="min-h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="offer-form"
            className="min-h-11"
            isPending={save.isPending}
            pendingLabel="Saving…"
          >
            {offer === null ? "Create offer" : "Save offer"}
          </Button>
        </>
      }
    >
      <form
        id="offer-form"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field
          label="Title"
          htmlFor="offer-title"
          hint="What a customer reads on the restaurant card."
        >
          <Input
            id="offer-title"
            required
            minLength={TITLE_MIN}
            value={form.title}
            placeholder="20% off the whole menu"
            onChange={(event) => set("title", event.target.value)}
            className="min-h-11"
          />
        </Field>

        <div className="flex flex-wrap gap-4">
          <div className="min-w-[170px] flex-1">
            <Field label="Kind" htmlFor="offer-kind">
              <Select
                id="offer-kind"
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
                htmlFor="offer-value"
              >
                <Input
                  id="offer-value"
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
              <Field
                label="Never more than"
                htmlFor="offer-cap"
                hint="Required. One large order would otherwise take the evening's margin."
              >
                <Input
                  id="offer-cap"
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
            <Field label="Minimum order" htmlFor="offer-min">
              <Input
                id="offer-min"
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
          <div className="min-w-[190px] flex-1">
            <Field label="Starts" htmlFor="offer-starts">
              <Input
                id="offer-starts"
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
            <Field label="Ends" htmlFor="offer-ends" hint="Leave empty to run until switched off.">
              <Input
                id="offer-ends"
                type="datetime-local"
                mono
                value={form.endsAt}
                onChange={(event) => set("endsAt", event.target.value)}
                className="min-h-11"
              />
            </Field>
          </div>
        </div>

        <Field label="Description" htmlFor="offer-description" hint="Optional. For your own notes.">
          <textarea
            id="offer-description"
            rows={2}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            className="w-full rounded-card border border-line-2 bg-surface px-3 py-2 font-sans text-sm text-ink placeholder:text-ink-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-sans text-[13px] font-medium text-ink-2">
            Which dishes?
          </legend>
          <p className="text-[12px] leading-snug text-ink-3">
            Tick nothing to apply it to the whole menu — which is what most offers
            want. Ticking dishes narrows it to those.
          </p>
          <div className="max-h-[160px] overflow-y-auto rounded-card border border-line">
            {dishes.map(({ item, categoryName }) => (
              <label
                key={item.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-line px-3 last:border-b-0 hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={form.menuItemIds.includes(item.id)}
                  onChange={() => toggleDish(item.id)}
                  className="size-4 accent-[var(--accent)]"
                />
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
                  {item.name}
                </span>
                <span className="shrink-0 text-[12px] text-ink-3">{categoryName}</span>
              </label>
            ))}
          </div>
        </fieldset>

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
              Off keeps the offer and its numbers, and stops it applying.
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
