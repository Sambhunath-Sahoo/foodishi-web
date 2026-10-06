"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { Badge, Button, Dialog } from "@repo/ui";
import {
  ALL_PERMISSIONS,
  GRANTABLE_PERMISSIONS,
  PERMISSION_HINTS,
  PERMISSION_LABELS,
  isBaseline,
  resolvePermissions,
} from "../../lib/permissions";
import { useSetStaffPermissions } from "../../lib/queries/staff";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { Permission, StaffMember } from "../../lib/types";

/**
 * What one staff member may do here, and the short list a manager can add to it.
 *
 * The dialog shows THREE states, not two, because "cannot" is two different
 * facts and collapsing them is the mistake a permissions screen usually makes:
 *
 *   - **Always** — the role's own floor. No checkbox, because there is nothing
 *     to decide; taking away "see incoming orders" from somebody working the
 *     queue is not a policy a restaurant has.
 *   - **Can be granted** — the two order refusals. A real checkbox.
 *   - **Manager only** — listed, greyed, and never a checkbox. Shown rather
 *     than hidden so a manager can see the whole shape of the job before
 *     deciding somebody needs it, and so nobody wonders whether the list is
 *     complete.
 *
 * The whole grant list is sent on save, so an unticked box is a real removal.
 */
export function PermissionsDialog({
  kitchen,
  member,
  onClose,
}: {
  readonly kitchen: ReadyKitchen;
  readonly member: StaffMember;
  readonly onClose: () => void;
}): React.JSX.Element {
  const [granted, setGranted] = React.useState<readonly Permission[]>(member.granted);
  const save = useSetStaffPermissions(kitchen);

  const effective = resolvePermissions(member.role, granted);
  const grantable = new Set(GRANTABLE_PERMISSIONS);

  function toggle(permission: Permission): void {
    setGranted((current) =>
      current.includes(permission)
        ? current.filter((entry) => entry !== permission)
        : [...current, permission],
    );
  }

  const isUnchanged =
    granted.length === member.granted.length &&
    granted.every((permission) => member.granted.includes(permission));

  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={`What ${member.user.name} can do`}
      description={`At ${kitchen.restaurant.name}. Their role sets the floor; the two ticks below are what you can add to it.`}
      footer={
        <>
          <Button variant="ghost" className="min-h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="min-h-11"
            disabled={isUnchanged}
            isPending={save.isPending}
            pendingLabel="Saving…"
            onClick={() =>
              save.mutate({ staffId: member.id, granted }, { onSuccess: onClose })
            }
          >
            Save permissions
          </Button>
        </>
      }
    >
      <ul className="flex flex-col">
        {ALL_PERMISSIONS.map((permission) => {
          const baseline = isBaseline(member.role, permission);
          const canGrant = grantable.has(permission) && !baseline;
          const isOn = effective.has(permission);
          const hint = PERMISSION_HINTS[permission];

          return (
            <li
              key={permission}
              className="flex items-start gap-3 border-b border-line py-2 last:border-b-0"
            >
              {canGrant ? (
                <label className="flex min-h-11 flex-1 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={granted.includes(permission)}
                    onChange={() => toggle(permission)}
                    className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] leading-snug text-ink">
                      {PERMISSION_LABELS[permission]}
                    </span>
                    {hint !== undefined ? (
                      <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">
                        {hint}
                      </span>
                    ) : null}
                  </span>
                  <Badge tone="warn">Can be granted</Badge>
                </label>
              ) : (
                <span className="flex flex-1 items-start gap-3 py-1">
                  <span aria-hidden="true" className="mt-1 size-4 shrink-0" />
                  <span
                    className={
                      isOn
                        ? "min-w-0 flex-1 text-[14px] leading-snug text-ink"
                        : "min-w-0 flex-1 text-[14px] leading-snug text-ink-3"
                    }
                  >
                    {PERMISSION_LABELS[permission]}
                  </span>
                  <Badge tone={isOn ? "ok" : "mute"}>
                    {isOn ? "Always" : "Manager only"}
                  </Badge>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {save.error !== null ? (
        <p role="alert" className="mt-3 text-[13px] leading-snug text-crit">
          {toUserMessage(save.error)}
        </p>
      ) : null}
    </Dialog>
  );
}
