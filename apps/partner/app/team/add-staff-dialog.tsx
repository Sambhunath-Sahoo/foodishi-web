"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { Button, Dialog, Field, Input, Select } from "@repo/ui";
import { ROLE_HINT, ROLE_OPTIONS } from "../../lib/permissions";
import { useAddStaff } from "../../lib/queries/staff";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { StaffRole } from "../../lib/types";

/**
 * The email is the whole form because it is the only handle a manager holds: a
 * restaurant manager cannot read the user directory, so there is no picker to
 * offer and nothing to search. The source matches the address exactly and
 * answers in its own words when it does not know it — which is also the only
 * honest way to tell somebody they typed it wrong.
 *
 * Deliberately not an invitation: this grants access to an account that already
 * exists. Somebody who has never signed up has to do that first.
 */
export function AddStaffDialog({
  kitchen,
  onClose,
}: {
  readonly kitchen: ReadyKitchen;
  readonly onClose: () => void;
}): React.JSX.Element {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<StaffRole>("staff");
  const add = useAddStaff(kitchen);

  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Give someone access"
      description={`They can work in ${kitchen.restaurant.name} the moment this saves — there is no invitation to accept.`}
      footer={
        <>
          <Button variant="ghost" className="min-h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-staff-form"
            className="min-h-11"
            isPending={add.isPending}
            pendingLabel="Adding…"
          >
            Give access
          </Button>
        </>
      }
    >
      {/* Returned, not fired and forgotten: the dialog closes only once the
          roster has been re-read, so it cannot shut on a list missing the new
          row. */}
      <form
        id="add-staff-form"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          add.mutate({ email: email.trim(), role }, { onSuccess: onClose });
        }}
      >
        <Field
          label="Their email"
          htmlFor="add-staff-email"
          hint="The address on their Foodishi account, spelled exactly. They must have signed up already."
        >
          <Input
            id="add-staff-email"
            type="email"
            mono
            required
            autoComplete="off"
            value={email}
            placeholder="name@example.com"
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-11"
          />
        </Field>

        <Field label="Role here" htmlFor="add-staff-role" hint={ROLE_HINT}>
          <Select
            id="add-staff-role"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(event) => setRole(event.target.value as StaffRole)}
            className="min-h-11"
          />
        </Field>

        <p className="text-[12px] leading-snug text-ink-3">
          Staff start with the shift and nothing else. Rejecting and cancelling
          orders can be granted afterwards, per person, from their row.
        </p>

        {add.error !== null ? (
          <p role="alert" className="text-[13px] leading-snug text-crit">
            {toUserMessage(add.error)}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
