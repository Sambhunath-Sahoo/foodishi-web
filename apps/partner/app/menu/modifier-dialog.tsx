"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { Badge, Button, Dialog, Field, Input, Select } from "@repo/ui";
import { formatMoney } from "../_lib/format";
import {
  useAddModifierOption,
  useRemoveModifierOption,
  useSaveModifierGroup,
  useUpdateModifierOption,
} from "../../lib/queries/menu";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { MenuCategory, ModifierGroup, ModifierKind } from "../../lib/types";

const NAME_MIN = 2;
const PRICE_STEP = "0.01";

const KIND_OPTIONS: readonly { readonly value: ModifierKind; readonly label: string }[] = [
  { value: "variant", label: "Pick one (a variant)" },
  { value: "addon", label: "Pick any (add-ons)" },
];

/** Said once, so the two words never drift between the dialog and the table. */
export const KIND_HINT =
  "A variant is one choice the customer must make — half plate or full, exactly one of the two. Add-ons are optional extras and they can pick several.";

/**
 * Adding, editing and filling one group of choices.
 *
 * The options are edited in place rather than in a nested dialog: a group with
 * no options does nothing at all, so the fastest path from "create a group" to
 * "it works" has to be one surface. Each option saves on its own — there is no
 * "save all", because a group being built is not a form being filled.
 */
export function ModifierDialog({
  kitchen,
  categories,
  group,
  onClose,
}: {
  readonly kitchen: ReadyKitchen;
  readonly categories: readonly MenuCategory[];
  /** null adds a group; a group edits it. */
  readonly group: ModifierGroup | null;
  readonly onClose: () => void;
}): React.JSX.Element {
  const [name, setName] = React.useState(group?.name ?? "");
  const [kind, setKind] = React.useState<ModifierKind>(group?.kind ?? "addon");
  const [maxSelect, setMaxSelect] = React.useState(String(group?.max_select ?? 3));
  const [minSelect, setMinSelect] = React.useState(String(group?.min_select ?? 0));
  const [attached, setAttached] = React.useState<readonly number[]>(
    group?.menu_item_ids ?? [],
  );

  const [optionName, setOptionName] = React.useState("");
  const [optionPrice, setOptionPrice] = React.useState("0.00");

  const save = useSaveModifierGroup(kitchen);
  const addOption = useAddModifierOption(kitchen);
  const updateOption = useUpdateModifierOption(kitchen);
  const removeOption = useRemoveModifierOption(kitchen);

  const dishes = categories.flatMap((category) =>
    category.items.map((item) => ({ item, categoryName: category.name })),
  );

  function toggleDish(itemId: number): void {
    setAttached((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId],
    );
  }

  function submit(): void {
    save.mutate(
      {
        groupId: group?.id ?? null,
        input: {
          restaurantId: kitchen.restaurantKey,
          name: name.trim(),
          kind,
          // A variant is exactly one choice by definition, so the bounds are not
          // the manager's to set and the fields are hidden for it.
          minSelect: kind === "variant" ? 1 : Number(minSelect),
          maxSelect: kind === "variant" ? 1 : Number(maxSelect),
          menuItemIds: attached,
        },
      },
      { onSuccess: group === null ? onClose : undefined },
    );
  }

  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={group === null ? "Add a group of choices" : `Edit ${group.name}`}
      description={KIND_HINT}
      footer={
        <>
          <Button variant="ghost" className="min-h-11" onClick={onClose}>
            {group === null ? "Cancel" : "Done"}
          </Button>
          <Button
            type="submit"
            form="modifier-form"
            className="min-h-11"
            isPending={save.isPending}
            pendingLabel="Saving…"
          >
            {group === null ? "Create group" : "Save group"}
          </Button>
        </>
      }
    >
      <form
        id="modifier-form"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field label="What is this group called?" htmlFor="group-name" hint="The customer reads this above the choices — Portion, Heat, Goes with the biryani.">
          <Input
            id="group-name"
            required
            minLength={NAME_MIN}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-11"
          />
        </Field>

        <Field label="How does it behave?" htmlFor="group-kind">
          <Select
            id="group-kind"
            options={KIND_OPTIONS}
            value={kind}
            onChange={(event) => setKind(event.target.value as ModifierKind)}
            className="min-h-11"
          />
        </Field>

        {kind === "addon" ? (
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[130px] flex-1">
              <Field label="Must pick at least" htmlFor="group-min" hint="0 to make it optional.">
                <Input
                  id="group-min"
                  type="number"
                  mono
                  min={0}
                  step={1}
                  value={minSelect}
                  onChange={(event) => setMinSelect(event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
            <div className="min-w-[130px] flex-1">
              <Field label="May pick up to" htmlFor="group-max">
                <Input
                  id="group-max"
                  type="number"
                  mono
                  min={1}
                  step={1}
                  value={maxSelect}
                  onChange={(event) => setMaxSelect(event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
          </div>
        ) : null}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-sans text-[13px] font-medium text-ink-2">
            Which dishes offer it?
          </legend>
          <p className="text-[12px] leading-snug text-ink-3">
            A group attached to nothing never appears. Tick the dishes it belongs to.
          </p>
          <div className="max-h-[180px] overflow-y-auto rounded-card border border-line">
            {dishes.map(({ item, categoryName }) => (
              <label
                key={item.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-line px-3 last:border-b-0 hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={attached.includes(item.id)}
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

        {save.error !== null ? (
          <p role="alert" className="text-[13px] leading-snug text-crit">
            {toUserMessage(save.error)}
          </p>
        ) : null}
      </form>

      {/*
        Only once the group exists. An option needs a group id to belong to, and
        offering the field before there is one would mean either losing what was
        typed or inventing a draft state for a dialog that does not need one.
      */}
      {group !== null ? (
        <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
          <h3 className="font-sans text-[13px] font-medium text-ink-2">
            The choices in {group.name}
          </h3>

          {group.options.length === 0 ? (
            <p className="text-[13px] text-ink-3">
              No choices yet. A group with none never appears to a customer.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {group.options.map((option) => (
                <li
                  key={option.id}
                  className="flex min-h-11 flex-wrap items-center gap-2 rounded-card border border-line px-3 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
                    {option.name}
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-ink-2">
                    {Number(option.price_delta) === 0
                      ? "no charge"
                      : `+ ${formatMoney(option.price_delta)}`}
                  </span>
                  <Badge tone={option.is_available ? "ok" : "crit"}>
                    {option.is_available ? "Available" : "Off"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    onClick={() =>
                      updateOption.mutate({
                        optionId: option.id,
                        patch: { is_available: !option.is_available },
                      })
                    }
                  >
                    {option.is_available ? "Turn off" : "Turn on"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 text-crit hover:bg-crit-soft"
                    aria-label={`Remove ${option.name}`}
                    onClick={() => removeOption.mutate(option.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {removeOption.error !== null ? (
            <p role="alert" className="text-[13px] leading-snug text-crit">
              {toUserMessage(removeOption.error)}
            </p>
          ) : null}

          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              addOption.mutate(
                {
                  groupId: group.id,
                  name: optionName.trim(),
                  priceDelta: optionPrice.trim() === "" ? "0.00" : optionPrice.trim(),
                },
                {
                  onSuccess: () => {
                    setOptionName("");
                    setOptionPrice("0.00");
                  },
                },
              );
            }}
          >
            <div className="min-w-[150px] flex-1">
              <Field label="Add a choice" htmlFor="option-name">
                <Input
                  id="option-name"
                  required
                  minLength={NAME_MIN}
                  value={optionName}
                  placeholder="Extra raita"
                  onChange={(event) => setOptionName(event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
            <div className="w-[120px]">
              <Field label="Extra cost" htmlFor="option-price">
                <Input
                  id="option-price"
                  type="number"
                  mono
                  min={0}
                  step={PRICE_STEP}
                  value={optionPrice}
                  onChange={(event) => setOptionPrice(event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
            <Button
              type="submit"
              variant="outline"
              className="min-h-11"
              isPending={addOption.isPending}
              pendingLabel="Adding…"
            >
              Add
            </Button>
          </form>

          {addOption.error !== null ? (
            <p role="alert" className="text-[13px] leading-snug text-crit">
              {toUserMessage(addOption.error)}
            </p>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
