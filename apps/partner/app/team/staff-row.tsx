"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import {
  Badge,
  Button,
  DataTableCell,
  DataTableRow,
  Dialog,
  Select,
  Thumb,
  cn,
} from "@repo/ui";
import { PermissionsDialog } from "./permissions-dialog";
import { GRANTABLE_PERMISSIONS, PERMISSION_LABELS, ROLE_LABELS, ROLE_OPTIONS } from "../../lib/permissions";
import {
  useRemoveStaff,
  useResetStaffAccess,
  useSetStaffActive,
  useSetStaffRole,
} from "../../lib/queries/staff";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { StaffMember, StaffRole } from "../../lib/types";

/**
 * Two lines of person plus 44px controls, and h-auto to drop the board's own
 * row height: this row carries a select and three buttons and has to grow.
 */
const TEAM_ROW_HEIGHT = "h-auto min-h-[56px]";

/** Which dialog this row has open. One value, so two cannot both be true. */
type RowDialog = "permissions" | "remove" | "reset";

/** "Can reject · can cancel" — what has been granted, in the roster's words. */
function describeGrants(member: StaffMember): string {
  if (member.role === "manager") return "Everything";
  const granted = GRANTABLE_PERMISSIONS.filter((permission) =>
    member.granted.includes(permission),
  );
  if (granted.length === 0) return "The shift only";
  return granted.map((permission) => PERMISSION_LABELS[permission]).join(" · ");
}

export function StaffRow({
  member,
  kitchen,
}: {
  readonly member: StaffMember;
  readonly kitchen: ReadyKitchen;
}): React.JSX.Element {
  const [dialog, setDialog] = React.useState<RowDialog | null>(null);
  const [resetTo, setResetTo] = React.useState<string | null>(null);

  const setRole = useSetStaffRole(kitchen);
  const setActive = useSetStaffActive(kitchen);
  const reset = useResetStaffAccess(kitchen);
  const remove = useRemoveStaff(kitchen);

  const canManage = kitchen.can("staff.manage");
  const isSelf = member.user_id === kitchen.actorId;

  return (
    <DataTableRow className={TEAM_ROW_HEIGHT}>
      <DataTableCell className="w-full max-w-0">
        <span className="flex items-center gap-3">
          {/* A circle, which is what a person gets, and 36px so a roster of
              eight reads as eight faces rather than eight lines. */}
          <Thumb
            src={member.user.avatar_url}
            name={member.user.name}
            size={36}
            shape="circle"
            // Thumb's own initials are ink-4, 2.4:1 on light; see account-menu.
            className="text-ink-3!"
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[15px] leading-tight text-ink">
              {member.user.name}
              {isSelf ? <span className="text-ink-3"> · you</span> : null}
            </span>
            <span className="truncate font-mono text-[13px] leading-tight text-ink-3">
              {member.user.email}
            </span>
          </span>
        </span>
      </DataTableCell>

      <DataTableCell className="py-1.5">
        {/*
          A select rather than a promote button: with two roles there is nothing
          to promote *to* that is not also a demotion for somebody else, and the
          source refuses to leave a restaurant with no active manager — which is
          the only reason changing a role exists at all, since without it a
          manager could never hand the restaurant over and step down.

          Never for your own row. That is the same lockout, one step subtler,
          and the source refuses it too.
        */}
        {canManage && !isSelf ? (
          <span className="flex flex-col gap-1">
            <Select
              options={ROLE_OPTIONS}
              value={member.role}
              aria-label={`Role for ${member.user.name}`}
              aria-busy={setRole.isPending || undefined}
              disabled={setRole.isPending}
              onChange={(event) =>
                setRole.mutate({
                  staffId: member.id,
                  role: event.target.value as StaffRole,
                })
              }
              className="min-h-11 w-[120px]"
            />
            {setRole.error !== null ? (
              <span role="alert" className="text-[11px] leading-snug text-crit">
                {toUserMessage(setRole.error)}
              </span>
            ) : null}
          </span>
        ) : (
          <Badge tone={member.role === "manager" ? "accent" : "mute"}>
            {ROLE_LABELS[member.role]}
          </Badge>
        )}
      </DataTableCell>

      <DataTableCell className="py-1.5">
        <span className="flex flex-col items-start gap-1">
          <span className="text-[13px] leading-snug text-ink-2">
            {describeGrants(member)}
          </span>
          {canManage && member.role === "staff" ? (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 px-2"
              onClick={() => setDialog("permissions")}
            >
              Change…
            </Button>
          ) : null}
        </span>
      </DataTableCell>

      <DataTableCell>
        <Badge tone={member.is_active ? "ok" : "mute"}>
          {member.is_active ? "Active" : "Revoked"}
        </Badge>
      </DataTableCell>

      <DataTableCell className="py-1.5">
        {/*
          Outline, not danger, on all three. Nothing on this roster needs doing,
          so a red rule on every active row would make the loudest thing on the
          screen an action nobody came here to take. The word stays
          crit-coloured; the frame does not.
        */}
        {canManage ? (
          <span className="flex flex-col items-end gap-1">
            <span className="flex flex-wrap justify-end gap-1.5">
              {/* Not on your own row either: it sat enabled beside "Another
                  manager changes your access", and the two contradicted each
                  other. Your own row is a caption, no buttons. */}
              {member.is_active && !isSelf ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 whitespace-nowrap"
                  isPending={reset.isPending}
                  pendingLabel="Sending…"
                  title="Send a fresh sign-in link and end the sessions they have open."
                  onClick={() =>
                    reset.mutate(member.id, {
                      onSuccess: (result) => {
                        setResetTo(result.email);
                        setDialog("reset");
                      },
                    })
                  }
                >
                  Reset access
                </Button>
              ) : null}

              {/* Never on your own row, for the same lockout reason as the role
                  select above: the source refuses it, and the footnote already
                  says so — so the two red buttons could only ever round-trip
                  into an error repeating it. */}
              {isSelf ? null : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "min-h-11 whitespace-nowrap",
                      member.is_active && "text-crit hover:bg-crit-soft",
                    )}
                    isPending={setActive.isPending}
                    pendingLabel="Saving…"
                    onClick={() =>
                      setActive.mutate({ staffId: member.id, isActive: !member.is_active })
                    }
                  >
                    {member.is_active ? "Revoke" : "Restore"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 whitespace-nowrap text-crit hover:bg-crit-soft"
                    aria-label={`Remove ${member.user.name} from this restaurant`}
                    onClick={() => setDialog("remove")}
                  >
                    Remove
                  </Button>
                </>
              )}
            </span>

            {isSelf ? (
              <span className="text-right text-[13px] leading-snug text-ink-3">
                Another manager changes your access
              </span>
            ) : null}

            {setActive.error !== null ? (
              <span role="alert" className="text-[11px] leading-snug text-crit">
                {toUserMessage(setActive.error)}
              </span>
            ) : null}
            {reset.error !== null ? (
              <span role="alert" className="text-[11px] leading-snug text-crit">
                {toUserMessage(reset.error)}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="block text-right text-[13px] text-ink-3">
            Managers change access
          </span>
        )}
      </DataTableCell>

      {dialog === "permissions" ? (
        <PermissionsDialog
          kitchen={kitchen}
          member={member}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog === "reset" ? (
        <Dialog
          open
          onOpenChange={() => setDialog(null)}
          title={`Access reset for ${member.user.name}`}
          description={`A fresh sign-in link is on its way to ${resetTo ?? member.user.email}, and any session they had open here has ended.`}
          footer={
            <Button variant="outline" className="min-h-11" onClick={() => setDialog(null)}>
              Done
            </Button>
          }
        >
          <p className="leading-snug">
            No password was set or shown — not to you and not to anybody standing
            at this tablet. They choose their own from the link. If they no
            longer have that address, revoke their access and add them again
            under the right one.
          </p>
        </Dialog>
      ) : null}

      {dialog === "remove" ? (
        <Dialog
          open
          onOpenChange={() => setDialog(null)}
          title={`Remove ${member.user.name}?`}
          description={`Their membership of ${kitchen.restaurant.name} is deleted outright — the roster will not remember they ever had access. Revoking instead keeps the record and takes the access away.`}
          footer={
            <>
              <Button variant="ghost" className="min-h-11" onClick={() => setDialog(null)}>
                Keep them
              </Button>
              {/* Outlined, never filled — and it names the person. */}
              <Button
                variant="danger"
                className="min-h-11"
                isPending={remove.isPending}
                pendingLabel="Removing…"
                onClick={() =>
                  remove.mutate(member.id, { onSuccess: () => setDialog(null) })
                }
              >
                Remove {member.user.name}
              </Button>
            </>
          }
        >
          <p className="leading-snug">
            This is for a row added by mistake. If they might come back, or the
            record of their access matters, revoke instead.
          </p>
          {remove.error !== null ? (
            <p role="alert" className="mt-2 text-[13px] leading-snug text-crit">
              {toUserMessage(remove.error)}
            </p>
          ) : null}
        </Dialog>
      ) : null}
    </DataTableRow>
  );
}
