"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Dialog,
} from "@repo/ui";
import { KIND_HINT, ModifierDialog } from "./modifier-dialog";
import { CardSkeletons, EmptyCard, LoadError, RefusedNote } from "../_components/states";
import { formatMoney, pluralise } from "../_lib/format";
import { ROLE_LABELS } from "../../lib/permissions";
import { useDeleteModifierGroup, useModifierGroups } from "../../lib/queries/menu";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { MenuCategory, ModifierGroup } from "../../lib/types";

function describeRule(group: ModifierGroup): string {
  if (group.kind === "variant") return "Customer picks exactly one";
  if (group.min_select === 0) {
    return `Optional · up to ${pluralise(group.max_select, "choice", "choices")}`;
  }
  return `At least ${group.min_select} · up to ${group.max_select}`;
}

/**
 * One group, its choices, and the dishes it is attached to.
 *
 * Cards rather than a table: a group is three unrelated facts — how it behaves,
 * what is in it, where it appears — and a row of five columns made all three
 * hard to read. There are rarely more than a handful of groups, so the density
 * argument that favours boards elsewhere does not apply here.
 */
function GroupCard({
  group,
  kitchen,
  dishNames,
  onEdit,
  onDelete,
}: {
  readonly group: ModifierGroup;
  readonly kitchen: ReadyKitchen;
  readonly dishNames: ReadonlyMap<number, string>;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}): React.JSX.Element {
  const attached = group.menu_item_ids
    .map((id) => dishNames.get(id))
    .filter((name): name is string => name !== undefined);
  const canEdit = kitchen.can("menu.modifiers");

  return (
    <Card>
      <CardHeader className="flex-wrap gap-2">
        <CardTitle>{group.name}</CardTitle>
        <Badge tone={group.kind === "variant" ? "accent" : "mute"}>
          {group.kind === "variant" ? "Pick one" : "Pick any"}
        </Badge>
        <span className="text-[13px] text-ink-3">{describeRule(group)}</span>
        {canEdit ? (
          <span className="ml-auto flex gap-1.5">
            <Button variant="outline" size="sm" className="min-h-11" onClick={onEdit}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              // Outlined, never filled (DESIGN.md non-negotiable 5), but still
              // crit: a delete has to read as one.
              className="min-h-11 text-crit hover:bg-crit-soft"
              onClick={onDelete}
            >
              Delete
            </Button>
          </span>
        ) : null}
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        {group.options.length === 0 ? (
          <p className="text-[13px] text-warn">
            No choices in this group, so customers do not see it.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {group.options.map((option) => (
              // Sold out is a standing state, not an emergency: crit red on
              // "Extra cheese" made one switched-off topping the loudest thing
              // on the menu. Muted, struck through, and the words say it.
              <li
                key={option.id}
                className={
                  option.is_available
                    ? "rounded-chip border border-line bg-surface-2 px-2.5 py-1 text-[13px] text-ink"
                    : "rounded-chip border border-line bg-surface px-2.5 py-1 text-[13px] text-ink-3"
                }
                title={option.is_available ? undefined : "Turned off — customers cannot pick this"}
              >
                <span className={option.is_available ? undefined : "line-through"}>
                  {option.name}
                </span>
                <span className="ml-1.5 font-mono tabular-nums text-ink-3">
                  {Number(option.price_delta) === 0
                    ? "free"
                    : `+${formatMoney(option.price_delta)}`}
                </span>
                {option.is_available ? null : (
                  <span className="ml-1.5 font-medium text-ink-2">· Sold out</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="text-[13px] leading-snug text-ink-3">
          {attached.length === 0 ? (
            <span className="text-warn">
              Attached to no dishes, so nobody will ever see it.
            </span>
          ) : (
            <>
              <span className="text-ink-2">On {attached.length === 1 ? "" : "these "}</span>
              {attached.join(", ")}
            </>
          )}
        </p>
      </CardBody>
    </Card>
  );
}

/**
 * Add-ons and variants.
 *
 * Served by /restaurants/{id}/modifier-groups on the live API now. It was
 * fixture-only once; should a source ever refuse with a 501 again, `LoadError`
 * draws that as the quiet notice it is rather than a red alarm.
 */
export function ModifierPanel({
  kitchen,
  categories,
}: {
  readonly kitchen: ReadyKitchen;
  readonly categories: readonly MenuCategory[];
}): React.JSX.Element {
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState<ModifierGroup | null>(null);

  const groups = useModifierGroups(kitchen);
  const remove = useDeleteModifierGroup(kitchen);
  const canEdit = kitchen.can("menu.modifiers");

  const dishNames = React.useMemo(() => {
    const names = new Map<number, string>();
    for (const category of categories) {
      for (const item of category.items) names.set(item.id, item.name);
    }
    return names;
  }, [categories]);

  // Read from the live list rather than held in state, so an option added
  // inside the dialog appears in the dialog it was added from.
  const editing = groups.data?.find((group) => group.id === editingId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {!canEdit ? (
        <RefusedNote
          title="Add-ons are a manager's to change"
          detail={`You are signed in as ${ROLE_LABELS[kitchen.role].toLowerCase()}. What a dish can be ordered with is part of the menu, not part of a shift.`}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[640px] text-[13px] leading-snug text-ink-3">{KIND_HINT}</p>
          <Button className="min-h-11" onClick={() => setIsAdding(true)}>
            Add a group
          </Button>
        </div>
      )}

      {groups.isPending ? <CardSkeletons count={2} label="Loading add-ons" /> : null}

      {groups.error !== null ? (
        <LoadError
          error={groups.error}
          title="Could not load add-ons and variants"
          refusedTitle="Add-ons are not on the live API yet"
          onRetry={() => {
            void groups.refetch();
          }}
        />
      ) : null}

      {groups.data !== undefined && groups.data.length === 0 ? (
        <EmptyCard
          title="No add-ons or variants yet"
          detail="A group is a question a customer answers while ordering — half plate or full, extra raita, less spicy. Add one and tick the dishes it belongs to."
        />
      ) : null}

      {groups.data !== undefined && groups.data.length > 0 ? (
        <div className="flex flex-col gap-4">
          {groups.data.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              kitchen={kitchen}
              dishNames={dishNames}
              onEdit={() => setEditingId(group.id)}
              onDelete={() => setDeleting(group)}
            />
          ))}
        </div>
      ) : null}

      {isAdding ? (
        <ModifierDialog
          kitchen={kitchen}
          categories={categories}
          group={null}
          onClose={() => setIsAdding(false)}
        />
      ) : null}

      {editing !== null ? (
        <ModifierDialog
          kitchen={kitchen}
          categories={categories}
          group={editing}
          onClose={() => setEditingId(null)}
        />
      ) : null}

      {deleting !== null ? (
        <Dialog
          open
          onOpenChange={() => setDeleting(null)}
          title={`Delete ${deleting.name}?`}
          description={`The group and its ${pluralise(deleting.options.length, "choice", "choices")} disappear from every dish they were attached to. Past orders keep what the customer actually chose.`}
          footer={
            <>
              <Button
                variant="ghost"
                className="min-h-11"
                onClick={() => setDeleting(null)}
              >
                Keep it
              </Button>
              <Button
                variant="danger"
                className="min-h-11"
                isPending={remove.isPending}
                pendingLabel="Deleting…"
                onClick={() =>
                  remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
                }
              >
                Delete {deleting.name}
              </Button>
            </>
          }
        >
          <p className="leading-snug">
            To stop offering one choice without losing the group, turn that choice
            off from Edit instead.
          </p>
          {remove.error !== null ? (
            <p role="alert" className="mt-2 text-[13px] leading-snug text-crit">
              {toUserMessage(remove.error)}
            </p>
          ) : null}
        </Dialog>
      ) : null}
    </div>
  );
}
