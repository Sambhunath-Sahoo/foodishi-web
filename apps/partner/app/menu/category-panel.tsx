"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import {
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  Dialog,
  Field,
  Input,
  TableFooter,
} from "@repo/ui";
import { EmptyCard, RefusedNote } from "../_components/states";
import { formatCount, pluralise } from "../_lib/format";
import { ROLE_LABELS } from "../../lib/permissions";
import { useDeleteCategory, useRenameCategory } from "../../lib/queries/menu";
import { CategoryDialog } from "./category-dialog";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { MenuCategory } from "../../lib/types";

const NAME_MIN = 2;

function RenameDialog({
  kitchen,
  category,
  onClose,
}: {
  readonly kitchen: ReadyKitchen;
  readonly category: MenuCategory;
  readonly onClose: () => void;
}): React.JSX.Element {
  const [name, setName] = React.useState(category.name);
  const rename = useRenameCategory(kitchen);
  const isUnchanged = name.trim() === category.name;

  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={`Rename ${category.name}`}
      description="Customers see the new heading on their next look at the menu. The dishes inside it do not move."
      footer={
        <>
          <Button variant="ghost" className="min-h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="rename-category-form"
            className="min-h-11"
            disabled={isUnchanged}
            isPending={rename.isPending}
            pendingLabel="Saving…"
          >
            Save name
          </Button>
        </>
      }
    >
      <form
        id="rename-category-form"
        onSubmit={(event) => {
          event.preventDefault();
          rename.mutate(
            { categoryId: category.id, name: name.trim() },
            { onSuccess: onClose },
          );
        }}
      >
        <Field label="Category name" htmlFor="rename-category-name">
          <Input
            id="rename-category-name"
            required
            minLength={NAME_MIN}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-11"
          />
        </Field>
        {rename.error !== null ? (
          <p role="alert" className="mt-3 text-[13px] leading-snug text-crit">
            {toUserMessage(rename.error)}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}

function DeleteDialog({
  kitchen,
  category,
  onClose,
}: {
  readonly kitchen: ReadyKitchen;
  readonly category: MenuCategory;
  readonly onClose: () => void;
}): React.JSX.Element {
  const remove = useDeleteCategory(kitchen);

  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={`Delete ${category.name}?`}
      description={`The heading disappears from the menu. A category that still holds dishes cannot be deleted at all — move them somewhere else first.`}
      footer={
        <>
          <Button variant="ghost" className="min-h-11" onClick={onClose}>
            Keep it
          </Button>
          <Button
            variant="danger"
            className="min-h-11"
            isPending={remove.isPending}
            pendingLabel="Deleting…"
            onClick={() => remove.mutate(category.id, { onSuccess: onClose })}
          >
            Delete {category.name}
          </Button>
        </>
      }
    >
      <p className="leading-snug">
        {category.items.length === 0
          ? "This category is empty, so nothing is lost but the heading."
          : `${pluralise(category.items.length, "dish", "dishes")} still sit${category.items.length === 1 ? "s" : ""} in ${category.name}, so this will be refused. Edit each dish and move it to another category first.`}
      </p>
      {remove.error !== null ? (
        <p role="alert" className="mt-2 text-[13px] leading-snug text-crit">
          {toUserMessage(remove.error)}
        </p>
      ) : null}
    </Dialog>
  );
}

/**
 * The headings on the menu, and the order they appear in.
 *
 * Its own tab rather than a corner of the dish table because a category is a
 * decision about how the menu READS, and it is made once a season — mixing it in
 * with the switch a cook taps forty times a service put a rare, structural
 * change next to a routine one.
 *
 * The sort order is shown and not editable. Neither data source has a reorder
 * route, and a drag handle that silently did nothing would be worse than a
 * column that says what the order is.
 */
export function CategoryPanel({
  kitchen,
  categories,
}: {
  readonly kitchen: ReadyKitchen;
  readonly categories: readonly MenuCategory[];
}): React.JSX.Element {
  const [isAdding, setIsAdding] = React.useState(false);
  const [renaming, setRenaming] = React.useState<MenuCategory | null>(null);
  const [deleting, setDeleting] = React.useState<MenuCategory | null>(null);

  const canEdit = kitchen.can("menu.categories");
  const totalDishes = categories.reduce(
    (total, category) => total + category.items.length,
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      {!canEdit ? (
        <RefusedNote
          title="Categories are a manager's to change"
          detail={`You are signed in as ${ROLE_LABELS[kitchen.role].toLowerCase()}. The headings below are the shape of the menu, and changing them is not part of a shift.`}
        />
      ) : (
        <div className="flex justify-end">
          <Button className="min-h-11" onClick={() => setIsAdding(true)}>
            Add a category
          </Button>
        </div>
      )}

      {categories.length === 0 ? (
        <EmptyCard
          title="No categories yet"
          detail="Every dish belongs to a category — Starters, Biryanis, Breads. Add the first one and dishes can go inside it."
        />
      ) : (
        <DataTableScroll
          footer={
            <TableFooter
              shown={categories.length}
              total={categories.length}
              noun="categories"
              sortedBy="the order they appear on the menu"
              extra={`${formatCount(totalDishes)} dishes in total`}
            />
          }
        >
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell numeric>#</DataTableHeaderCell>
                <DataTableHeaderCell>Category</DataTableHeaderCell>
                <DataTableHeaderCell numeric>Dishes</DataTableHeaderCell>
                <DataTableHeaderCell numeric>Sold out</DataTableHeaderCell>
                {canEdit ? (
                  <DataTableHeaderCell className="text-right">Change</DataTableHeaderCell>
                ) : null}
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {categories.map((category, index) => {
                const soldOut = category.items.filter((item) => !item.is_available).length;
                return (
                  <DataTableRow key={category.id} className="h-[52px]">
                    <DataTableCell numeric mono className="text-ink-3">
                      {index + 1}
                    </DataTableCell>
                    <DataTableCell className="w-full text-[15px] text-ink">
                      {category.name}
                    </DataTableCell>
                    <DataTableCell numeric mono className="text-ink-2">
                      {formatCount(category.items.length)}
                    </DataTableCell>
                    <DataTableCell
                      numeric
                      mono
                      // Ink, not crit: a sold-out dish is a standing state the
                      // number already states, not a failure.
                      className={soldOut > 0 ? "font-semibold text-ink" : "text-ink-3"}
                    >
                      {formatCount(soldOut)}
                    </DataTableCell>
                    {canEdit ? (
                      <DataTableCell className="py-1.5 text-right">
                        <span className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-11"
                            onClick={() => setRenaming(category)}
                          >
                            Rename
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            // Outlined, never filled (DESIGN.md non-negotiable 5),
                            // but still crit: a delete has to read as one.
                            className="min-h-11 text-crit hover:bg-crit-soft"
                            onClick={() => setDeleting(category)}
                          >
                            Delete
                          </Button>
                        </span>
                      </DataTableCell>
                    ) : null}
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        </DataTableScroll>
      )}

      {isAdding ? (
        <CategoryDialog kitchen={kitchen} onClose={() => setIsAdding(false)} />
      ) : null}
      {renaming !== null ? (
        <RenameDialog
          kitchen={kitchen}
          category={renaming}
          onClose={() => setRenaming(null)}
        />
      ) : null}
      {deleting !== null ? (
        <DeleteDialog
          kitchen={kitchen}
          category={deleting}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}
