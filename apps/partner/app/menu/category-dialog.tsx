"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { Button, Dialog, Field, Input } from "@repo/ui";
import { useCreateCategory } from "../../lib/queries/menu";
import type { ReadyKitchen } from "../../lib/kitchen";

const NAME_MIN = 2;

/**
 * Every dish belongs to a category, so a restaurant with none cannot add its
 * first dish at all. This is the way out of that.
 */
export function CategoryDialog({
  kitchen,
  onClose,
}: {
  readonly kitchen: ReadyKitchen;
  readonly onClose: () => void;
}): React.JSX.Element {
  const [name, setName] = React.useState("");
  const create = useCreateCategory(kitchen);

  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Add a category"
      description="A heading on the menu — Starters, Biryanis, Breads. Dishes go inside it."
      footer={
        <>
          <Button variant="ghost" className="min-h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="category-form"
            className="min-h-11"
            isPending={create.isPending}
            pendingLabel="Adding…"
          >
            Add category
          </Button>
        </>
      }
    >
      {/* Returned, not fired and forgotten: the dialog closes only once the menu
          has been re-read, so the new category is there to add a dish to. */}
      <form
        id="category-form"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate(name.trim(), { onSuccess: onClose });
        }}
      >
        <Field label="Category name" htmlFor="category-name">
          <Input
            id="category-name"
            required
            minLength={NAME_MIN}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-11"
          />
        </Field>

        {create.error !== null ? (
          <p role="alert" className="mt-3 text-[13px] leading-snug text-crit">
            {toUserMessage(create.error)}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
