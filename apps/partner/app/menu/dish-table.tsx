"use client";

import * as React from "react";
import {
  Button,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  EmptyState,
  Field,
  Input,
  TableFooter,
  Thumb,
} from "@repo/ui";
import { DishDialog } from "./dish-dialog";
import { DishMarks } from "./dish-marks";
import { AvailabilityToggle } from "../_components/availability-toggle";
import { EmptyCard, RefusedNote } from "../_components/states";
import { formatCount, formatMoney, pluralise } from "../_lib/format";
import { ROLE_LABELS } from "../../lib/permissions";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { MenuCategory, MenuItem } from "../../lib/types";

/** Taller than a board row: the switch inside must stay a 44px tap. */
const MENU_ROW_HEIGHT = "h-[52px]";

function countSoldOut(categories: readonly MenuCategory[]): {
  readonly soldOut: number;
  readonly total: number;
} {
  const items = categories.flatMap((category) => category.items);
  return {
    soldOut: items.filter((item) => !item.is_available).length,
    total: items.length,
  };
}

function matches(item: MenuItem, needle: string): boolean {
  if (needle === "") return true;
  const haystack = `${item.name} ${item.description ?? ""}`.toLowerCase();
  return haystack.includes(needle);
}

function CategoryRows({
  category,
  kitchen,
  columnCount,
  onEdit,
}: {
  readonly category: MenuCategory;
  readonly kitchen: ReadyKitchen;
  readonly columnCount: number;
  readonly onEdit: (item: MenuItem) => void;
}): React.JSX.Element {
  return (
    <>
      <tr>
        <th
          scope="colgroup"
          colSpan={columnCount}
          className="h-[28px] border-y border-line bg-surface-2 px-3 text-left text-[10px] font-bold tracking-[0.07em] text-ink-3 uppercase"
        >
          {category.name}
          <span className="ml-2 font-normal tracking-normal text-ink-4 normal-case">
            {pluralise(category.items.length, "dish", "dishes")}
          </span>
        </th>
      </tr>

      {category.items.length === 0 ? (
        <DataTableRow>
          <DataTableCell colSpan={columnCount} wrap className="py-2 text-[13px] text-ink-3">
            Nothing in {category.name} matches. Dishes added to it appear here with a
            price and a switch.
          </DataTableCell>
        </DataTableRow>
      ) : null}

      {category.items.map((item) => (
        <DataTableRow key={item.id} className={MENU_ROW_HEIGHT}>
          <DataTableCell className="w-full max-w-0">
            <span className="flex items-center gap-3">
              {/* 40px keeps the row height the switch sets. On a greasy kitchen
                  tablet the photo is how somebody confirms they are toggling
                  the right dish without reading. */}
              <Thumb src={item.image_url} name={item.name} size={40} />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[15px] leading-tight text-ink">
                  {item.name}
                </span>
                <DishMarks item={item} />
              </span>
            </span>
          </DataTableCell>
          <DataTableCell numeric mono className="text-[15px] text-ink-2">
            {formatMoney(item.price)}
          </DataTableCell>
          <DataTableCell numeric mono className="text-[15px] text-ink-3">
            {item.serves}
          </DataTableCell>
          <DataTableCell className="py-1.5">
            <AvailabilityToggle item={item} kitchen={kitchen} compact />
          </DataTableCell>
          {kitchen.can("menu.edit") ? (
            <DataTableCell className="py-1.5 text-right">
              <Button
                variant="outline"
                size="sm"
                className="min-h-11"
                aria-label={`Edit ${item.name}`}
                onClick={() => onEdit(item)}
              >
                Edit
              </Button>
            </DataTableCell>
          ) : null}
        </DataTableRow>
      ))}
    </>
  );
}

/**
 * Every dish, grouped by category, each with a price and the one switch a
 * kitchen touches mid-service.
 *
 * The switch is available to a shift worker and the Edit button is not, and
 * that difference is the whole shape of this screen: selling a dish out is
 * service, repricing it is not.
 */
export function DishTable({
  kitchen,
  categories,
}: {
  readonly kitchen: ReadyKitchen;
  readonly categories: readonly MenuCategory[];
}): React.JSX.Element {
  const [editing, setEditing] = React.useState<MenuItem | null>(null);
  const [isAdding, setIsAdding] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const canEdit = kitchen.can("menu.edit");
  const needle = search.trim().toLowerCase();

  const filtered = React.useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          items: category.items.filter((item) => matches(item, needle)),
        }))
        // A category with nothing matching is noise while somebody is searching,
        // and a real fact about the menu when they are not.
        .filter((category) => needle === "" || category.items.length > 0),
    [categories, needle],
  );

  const tally = countSoldOut(filtered);
  // The Edit column only exists for somebody who may write, so the category
  // heading has to span a different width for a shift worker than a manager.
  const columnCount = canEdit ? 5 : 4;

  if (categories.length === 0) {
    return canEdit ? (
      <Card>
        <EmptyState
          title="This menu has no categories yet"
          detail="Every dish belongs to a category — Starters, Biryanis, Breads — so the first thing to add is a category. Open the Categories tab."
        />
      </Card>
    ) : (
      <EmptyCard
        title="This menu has no categories yet"
        detail="Categories such as Starters, Biryanis and Breads appear here once a manager adds them, each with its dishes and an availability switch."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!canEdit ? (
        <RefusedNote
          title="You can sell a dish out, but not change it"
          detail={`Adding, pricing and describing dishes needs a manager, and you are signed in as ${ROLE_LABELS[kitchen.role].toLowerCase()}. The switch on every row is yours.`}
        />
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-[240px]">
          <Field label="Find a dish" htmlFor="menu-search">
            <Input
              id="menu-search"
              type="search"
              value={search}
              placeholder="Butter Chicken"
              onChange={(event) => setSearch(event.target.value)}
              className="min-h-11"
            />
          </Field>
        </div>
        {canEdit ? (
          <Button className="min-h-11" onClick={() => setIsAdding(true)}>
            Add a dish
          </Button>
        ) : null}
      </div>

      <DataTableScroll
        footer={
          <TableFooter
            shown={tally.total}
            total={countSoldOut(categories).total}
            noun="dishes"
            sortedBy="category, then the order the kitchen set"
            extra={
              tally.soldOut === 0
                ? "none sold out"
                : `${formatCount(tally.soldOut)} sold out`
            }
          />
        }
      >
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Dish</DataTableHeaderCell>
              <DataTableHeaderCell numeric>Price</DataTableHeaderCell>
              <DataTableHeaderCell numeric>Serves</DataTableHeaderCell>
              <DataTableHeaderCell>On the menu</DataTableHeaderCell>
              {canEdit ? (
                <DataTableHeaderCell className="text-right">Change</DataTableHeaderCell>
              ) : null}
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {filtered.map((category) => (
              <CategoryRows
                key={category.id}
                category={category}
                kitchen={kitchen}
                columnCount={columnCount}
                onEdit={setEditing}
              />
            ))}
          </DataTableBody>
        </DataTable>
      </DataTableScroll>

      {/* Mounted only while open, so each dialog seeds its fields from the dish
          it was opened for and nothing has to be resynchronised on close. */}
      {isAdding ? (
        <DishDialog
          kitchen={kitchen}
          categories={categories}
          item={null}
          onClose={() => setIsAdding(false)}
        />
      ) : null}

      {editing !== null ? (
        <DishDialog
          kitchen={kitchen}
          categories={categories}
          item={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
