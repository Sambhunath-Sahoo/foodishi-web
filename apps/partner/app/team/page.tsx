"use client";

import * as React from "react";
import {
  Button,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  PageTitle,
  TableFooter,
} from "@repo/ui";
import { AddStaffDialog } from "./add-staff-dialog";
import { StaffRow } from "./staff-row";
import { KitchenGate } from "../_components/kitchen-gate";
import { CardSkeletons, EmptyCard, LoadError } from "../_components/states";
import { formatCount, pluralise } from "../_lib/format";
import { roleRank } from "../../lib/permissions";
import { useStaff } from "../../lib/queries/staff";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { StaffMember } from "../../lib/types";

/** Managers first: somebody reading a roster wants to see who can change things. */
function byRoleThenName(rows: readonly StaffMember[]): readonly StaffMember[] {
  return [...rows].sort((left, right) => {
    const rank = roleRank(left.role) - roleRank(right.role);
    if (rank !== 0) return rank;
    // Revoked rows sink below active ones of the same role: they are kept for
    // the record, not to be read first.
    if (left.is_active !== right.is_active) return left.is_active ? -1 : 1;
    return left.user.name.localeCompare(right.user.name);
  });
}

function Team({ kitchen }: { readonly kitchen: ReadyKitchen }): React.JSX.Element {
  const [isAdding, setIsAdding] = React.useState(false);
  const staff = useStaff(kitchen);

  const members = staff.data === undefined ? [] : byRoleThenName(staff.data.items);
  const activeCount = members.filter((member) => member.is_active).length;
  const managerCount = members.filter(
    (member) => member.is_active && member.role === "manager",
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {kitchen.can("staff.manage") ? (
        <div className="flex justify-end">
          <Button className="min-h-11" onClick={() => setIsAdding(true)}>
            Give someone access
          </Button>
        </div>
      ) : null}

      {staff.isPending ? <CardSkeletons count={2} label="Loading the team" /> : null}

      {staff.error !== null ? (
        <LoadError
          error={staff.error}
          title="Could not load the team"
          onRetry={() => {
            void staff.refetch();
          }}
        />
      ) : null}

      {staff.data !== undefined && members.length === 0 ? (
        <EmptyCard
          title="Nobody works here yet"
          detail="Everyone granted access to this restaurant appears here with the role they hold and what they may do. Revoked memberships stay on the list rather than disappearing."
        />
      ) : null}

      {members.length > 0 ? (
        <DataTableScroll
          footer={
            <TableFooter
              shown={members.length}
              total={members.length}
              noun="people"
              sortedBy="role, then who still has access, then name"
              extra={`${formatCount(activeCount)} active · ${pluralise(managerCount, "manager", "managers")}`}
            />
          }
        >
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Person</DataTableHeaderCell>
                <DataTableHeaderCell>Role here</DataTableHeaderCell>
                <DataTableHeaderCell>What they can do</DataTableHeaderCell>
                <DataTableHeaderCell>Access</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right">Change</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {members.map((member) => (
                <StaffRow key={member.id} member={member} kitchen={kitchen} />
              ))}
            </DataTableBody>
          </DataTable>
        </DataTableScroll>
      ) : null}

      {/*
        Stated on the screen rather than only in a refusal. A manager planning
        to hand the restaurant over needs to know the order of operations
        BEFORE they revoke themselves and find out.
      */}
      {members.length > 0 ? (
        <p className="text-[12px] leading-snug text-ink-3">
          A restaurant always keeps at least one active manager, and nobody can
          change their own role or revoke their own access — otherwise one tap
          locks everybody out of the menu, the money and this screen. To step
          down, make somebody else a manager first and ask them to revoke you.
        </p>
      ) : null}

      {isAdding ? (
        <AddStaffDialog kitchen={kitchen} onClose={() => setIsAdding(false)} />
      ) : null}
    </div>
  );
}

/**
 * Everyone with access to this restaurant.
 *
 * Reading the roster and changing it are two permissions, not one, because they
 * are two jobs: a senior cook can reasonably be shown who else is on tonight
 * without being able to revoke them. Both are a manager's today.
 */
export default function TeamPage(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle subtitle="Who works here, what each of them may do, and how to take access away. Revoking keeps the record; removing forgets they were ever here.">
        Team
      </PageTitle>

      <KitchenGate loadingCards={2} loadingLabel="Loading the team" requires="staff.view">
        {(kitchen) => <Team kitchen={kitchen} />}
      </KitchenGate>
    </div>
  );
}
