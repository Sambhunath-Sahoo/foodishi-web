"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { Button, Dialog, Field, Input, Select, Thumb } from "@repo/ui";
import {
  useCreateMenuItem,
  useDeleteMenuItem,
  useUpdateMenuItem,
} from "../../lib/queries/menu";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { MenuCategory, MenuItem, MenuItemPatch, SpiceLevel } from "../../lib/types";

/** The source's own bounds, so a bad value is caught before it is a round trip. */
const NAME_MIN = 2;
const SERVES_MIN = 1;
const SERVES_MAX = 50;
const CALORIES_MAX = 10_000;
const PRICE_STEP = "0.01";

const SPICE_OPTIONS: readonly { readonly value: SpiceLevel; readonly label: string }[] = [
  { value: "none", label: "Not spiced" },
  { value: "mild", label: "Mild" },
  { value: "medium", label: "Medium" },
  { value: "hot", label: "Hot" },
];

const DIET_OPTIONS = [
  { value: "veg", label: "Veg" },
  { value: "non-veg", label: "Non-veg" },
] as const;

interface DishForm {
  readonly categoryId: string;
  readonly name: string;
  readonly price: string;
  readonly diet: string;
  readonly spiceLevel: string;
  readonly serves: string;
  readonly calories: string;
  readonly description: string;
  readonly imageUrl: string;
}

function toForm(item: MenuItem | null, fallbackCategoryId: string): DishForm {
  if (item === null) {
    return {
      categoryId: fallbackCategoryId,
      name: "",
      price: "",
      diet: "veg",
      spiceLevel: "none",
      serves: "1",
      calories: "",
      description: "",
      imageUrl: "",
    };
  }
  return {
    categoryId: String(item.category_id),
    name: item.name,
    price: item.price,
    diet: item.is_veg ? "veg" : "non-veg",
    spiceLevel: item.spice_level,
    serves: String(item.serves),
    calories: item.calories === null ? "" : String(item.calories),
    description: item.description ?? "",
    imageUrl: item.image_url ?? "",
  };
}

function trimForm(form: DishForm): DishForm {
  return {
    ...form,
    name: form.name.trim(),
    price: form.price.trim(),
    serves: form.serves.trim(),
    calories: form.calories.trim(),
    description: form.description.trim(),
    imageUrl: form.imageUrl.trim(),
  };
}

/**
 * Only the fields that changed.
 *
 * The three nullable columns send null when emptied — "no calorie count" and
 * "zero calories" are different answers, and so are no photo and an empty
 * string — and every other field is omitted rather than nulled, which the
 * source rejects.
 */
function toPatch(next: DishForm, saved: DishForm): MenuItemPatch & {
  readonly image_url?: string | null;
} {
  return {
    ...(next.categoryId !== saved.categoryId
      ? { category_id: Number(next.categoryId) }
      : {}),
    ...(next.name !== saved.name ? { name: next.name } : {}),
    ...(next.price !== saved.price ? { price: next.price } : {}),
    ...(next.diet !== saved.diet ? { is_veg: next.diet === "veg" } : {}),
    ...(next.spiceLevel !== saved.spiceLevel
      ? { spice_level: next.spiceLevel as SpiceLevel }
      : {}),
    ...(next.serves !== saved.serves ? { serves: Number(next.serves) } : {}),
    ...(next.calories !== saved.calories
      ? { calories: next.calories === "" ? null : Number(next.calories) }
      : {}),
    ...(next.description !== saved.description
      ? { description: next.description === "" ? null : next.description }
      : {}),
    ...(next.imageUrl !== saved.imageUrl
      ? { image_url: next.imageUrl === "" ? null : next.imageUrl }
      : {}),
  };
}

export interface DishDialogProps {
  readonly kitchen: ReadyKitchen;
  readonly categories: readonly MenuCategory[];
  /** null adds a dish; a dish edits it, and only then can it be deleted. */
  readonly item: MenuItem | null;
  readonly onClose: () => void;
}

/**
 * One surface for adding, editing and deleting a dish, because they are the
 * same ten fields and a kitchen tablet has no room for three screens.
 *
 * Delete swaps this dialog into a confirm that names the dish rather than
 * opening a second one over it, and it is outlined rather than filled. Most
 * deletes will be refused: past receipts keep their link to every dish that has
 * ever been ordered, and the refusal names the alternative itself, so its words
 * go through untouched.
 */
export function DishDialog({
  kitchen,
  categories,
  item,
  onClose,
}: DishDialogProps): React.JSX.Element {
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

  // Seeded once: the table mounts this dialog only while it is open, so there
  // is no stale edit to resynchronise and no effect needed to do it.
  const saved = React.useMemo(
    () => toForm(item, String(categories[0]?.id ?? "")),
    [item, categories],
  );
  const [form, setForm] = React.useState(saved);

  const create = useCreateMenuItem(kitchen);
  const update = useUpdateMenuItem(kitchen);
  const remove = useDeleteMenuItem(kitchen);
  const save = item === null ? create : update;

  const categoryOptions = categories.map((category) => ({
    value: String(category.id),
    label: category.name,
  }));

  function set<TField extends keyof DishForm>(field: TField, value: string): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const patch = item === null ? null : toPatch(trimForm(form), saved);
  const hasChanges = patch === null || Object.keys(patch).length > 0;

  function submit(): void {
    const next = trimForm(form);
    if (item === null) {
      create.mutate(
        {
          category_id: Number(next.categoryId),
          name: next.name,
          price: next.price,
          is_veg: next.diet === "veg",
          spice_level: next.spiceLevel as SpiceLevel,
          serves: Number(next.serves),
          calories: next.calories === "" ? null : Number(next.calories),
          description: next.description === "" ? null : next.description,
          is_available: true,
        },
        { onSuccess: onClose },
      );
      return;
    }
    update.mutate({ itemId: item.id, patch: toPatch(next, saved) }, { onSuccess: onClose });
  }

  if (item !== null && isConfirmingDelete) {
    return (
      <Dialog
        open
        onOpenChange={onClose}
        title={`Delete ${item.name}?`}
        description={`${item.name} disappears from the menu for good. Marking it sold out keeps the dish and takes it off the menu until you put it back.`}
        footer={
          <>
            <Button
              variant="ghost"
              className="min-h-11"
              onClick={() => setIsConfirmingDelete(false)}
            >
              Keep the dish
            </Button>
            {/* Outlined, never filled — and it names the dish. */}
            <Button
              variant="danger"
              className="min-h-11"
              isPending={remove.isPending}
              pendingLabel="Deleting…"
              onClick={() => remove.mutate(item.id, { onSuccess: onClose })}
            >
              Delete {item.name}
            </Button>
          </>
        }
      >
        <p className="leading-snug">
          A dish that has ever been ordered cannot be deleted at all — past
          receipts keep their link to it — and the answer below will say so.
        </p>
        {remove.error !== null ? (
          <p role="alert" className="mt-2 text-[13px] leading-snug text-crit">
            {toUserMessage(remove.error)}
          </p>
        ) : null}
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={item === null ? "Add a dish" : `Edit ${item.name}`}
      description={
        item === null
          ? "It goes on the menu straight away, available. Use the switch on its row to sell it out."
          : "Customers see these changes on their next look at the menu."
      }
      footer={
        <>
          {item !== null && kitchen.can("menu.delete") ? (
            <Button
              variant="outline"
              className="mr-auto min-h-11 text-crit hover:bg-crit-soft"
              onClick={() => setIsConfirmingDelete(true)}
            >
              Delete…
            </Button>
          ) : null}
          <Button variant="ghost" className="min-h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="dish-form"
            className="min-h-11"
            disabled={!hasChanges}
            isPending={save.isPending}
            pendingLabel="Saving…"
          >
            {item === null ? "Add dish" : "Save dish"}
          </Button>
        </>
      }
    >
      {/* The submit button lives in the dialog's footer, outside this element,
          so the form is addressed by id rather than by nesting. */}
      <form
        id="dish-form"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field label="Dish name" htmlFor="dish-name">
          <Input
            id="dish-name"
            required
            minLength={NAME_MIN}
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
            className="min-h-11"
          />
        </Field>

        <div className="flex flex-wrap gap-4">
          <div className="min-w-[150px] flex-1">
            <Field label="Category" htmlFor="dish-category">
              <Select
                id="dish-category"
                required
                options={categoryOptions}
                value={form.categoryId}
                onChange={(event) => set("categoryId", event.target.value)}
                className="min-h-11"
              />
            </Field>
          </div>
          <div className="min-w-[110px] flex-1">
            <Field label="Price" htmlFor="dish-price">
              <Input
                id="dish-price"
                type="number"
                mono
                required
                min={PRICE_STEP}
                step={PRICE_STEP}
                value={form.price}
                onChange={(event) => set("price", event.target.value)}
                className="min-h-11"
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="min-w-[120px] flex-1">
            <Field label="Diet" htmlFor="dish-diet">
              <Select
                id="dish-diet"
                options={DIET_OPTIONS}
                value={form.diet}
                onChange={(event) => set("diet", event.target.value)}
                className="min-h-11"
              />
            </Field>
          </div>
          <div className="min-w-[120px] flex-1">
            <Field label="Heat" htmlFor="dish-spice">
              <Select
                id="dish-spice"
                options={SPICE_OPTIONS}
                value={form.spiceLevel}
                onChange={(event) => set("spiceLevel", event.target.value)}
                className="min-h-11"
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="min-w-[120px] flex-1">
            <Field label="Serves" htmlFor="dish-serves" hint="How many people.">
              <Input
                id="dish-serves"
                type="number"
                mono
                required
                min={SERVES_MIN}
                max={SERVES_MAX}
                step={1}
                value={form.serves}
                onChange={(event) => set("serves", event.target.value)}
                className="min-h-11"
              />
            </Field>
          </div>
          <div className="min-w-[120px] flex-1">
            <Field label="Calories" htmlFor="dish-calories" hint="Optional.">
              <Input
                id="dish-calories"
                type="number"
                mono
                min={0}
                max={CALORIES_MAX}
                step={1}
                value={form.calories}
                onChange={(event) => set("calories", event.target.value)}
                className="min-h-11"
              />
            </Field>
          </div>
        </div>

        <Field
          label="Description"
          htmlFor="dish-description"
          hint="Optional. What a customer wants to know before ordering it."
        >
          <textarea
            id="dish-description"
            rows={3}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            className="w-full rounded-card border border-line-2 bg-surface px-3 py-2 font-sans text-sm text-ink placeholder:text-ink-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          />
        </Field>

        {/*
          A URL, and one cover rather than a gallery.
          
          The API does have a gallery — GET/POST /menu-items/{id}/images, a
          signed upload-url flow, reordering and delete — and the customer app
          reads it. This screen writes the single `image_url` on the dish, which
          is what its own table renders. Wiring the gallery is a separate screen
          with its own reorder affordance, and claiming there is "no upload"
          would be untrue: there is, this dialog just is not it.
          
          The preview beside the field is the only honest way to tell a working
          URL from a typo before saving.
        */}
        <Field
          label="Cover photo URL"
          htmlFor="dish-image"
          hint="Optional. Paste a link to an image. This sets the one cover the menu table and the customer's list row show — a full photo gallery is managed elsewhere."
        >
          <span className="flex items-center gap-3">
            <Input
              id="dish-image"
              type="url"
              mono
              value={form.imageUrl}
              placeholder="https://…"
              onChange={(event) => set("imageUrl", event.target.value)}
              className="min-h-11"
            />
            <Thumb
              src={form.imageUrl === "" ? null : form.imageUrl}
              name={form.name === "" ? "New dish" : form.name}
              size={44}
            />
          </span>
        </Field>

        {save.error !== null ? (
          <p role="alert" className="text-[13px] leading-snug text-crit">
            {toUserMessage(save.error)}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
