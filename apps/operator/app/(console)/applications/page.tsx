"use client";

import * as React from "react";
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  FilterChip,
  PageTitle,
  Pagination,
  SegmentedControl,
  TableFooter,
  Toolbar,
} from "@repo/ui";
import { ApplicationDrawer } from "../../../components/application-drawer";
import { BoardSkeleton } from "../../../components/board-skeleton";
import { QueryState } from "../../../components/query-state";
import { RowAction } from "../../../components/row-action";
import { formatDateOnly, formatMoneyWhole } from "../../../lib/format";
import { DECK_PAGE, DECK_PANEL } from "../../../lib/deck";
import { useApplications } from "../../../lib/queries";
import type { ApplicationStatus, RestaurantApplicationRow } from "../../../lib/api-types";

/**
 * Restaurants asking to join, and the queue an operator works through.
 *
 * The only screen in this console whose rows are not yet part of the platform:
 * an application describes a kitchen that does not exist, and approving one is
 * what creates it. That is why the decision lives behind a panel rather than as
 * a switch in the row — it writes three tables and hands somebody a login, and a
 * one-click column would put that a mis-tap away.
 *
 * Waiting is the default filter and the only one that is. Everywhere else in the
 * console a default filter would hide rows somebody came to find; here the
 * unanswered ones ARE what somebody came to find, and the other tabs are for the
 * question "did we already turn these people down".
 */

type Tab = "pending" | "any" | "approved" | "rejected";

const TABS = [
  { value: "pending" as const, label: "Waiting" },
  { value: "any" as const, label: "Every state" },
  { value: "approved" as const, label: "Approved" },
  { value: "rejected" as const, label: "Turned down" },
];

/** The status each tab asks for. "any" omits the filter entirely. */
const TAB_FILTER: Record<Tab, ApplicationStatus | null> = {
  pending: "pending",
  any: null,
  approved: "approved",
  rejected: "rejected",
};

const EMPTY_TITLE: Record<Tab, string> = {
  pending: "Nothing waiting",
  any: "No applications yet",
  approved: "None approved yet",
  rejected: "None turned down",
};

const EMPTY_DETAIL: Record<Tab, string> = {
  pending:
    "Every application has been answered. New ones arrive here the moment a restaurant sends one, and the count in the navigation is the same figure.",
  any: "A restaurant applies from the partner console and lands here. Nothing on this page is created by Foodishi.",
  approved:
    "An approved application creates its restaurant closed, and appears here with the id it was given.",
  rejected:
    "A turned-down application keeps the reason it was given, so a resubmission arrives beside the answer it already had.",
};

function StatusBadge({
  status,
}: {
  readonly status: ApplicationStatus;
}): React.JSX.Element {
  if (status === "pending") return <Badge tone="accent">Waiting</Badge>;
  if (status === "approved") return <Badge tone="ok">Approved</Badge>;
  return <Badge tone="mute">Turned down</Badge>;
}

export default function ApplicationsPage(): React.JSX.Element {
  const [tab, setTab] = React.useState<Tab>("pending");
  const [offset, setOffset] = React.useState(0);
  const [open, setOpen] = React.useState<RestaurantApplicationRow | null>(null);

  const applications = useApplications(TAB_FILTER[tab], offset);

  const changeTab = React.useCallback((next: Tab) => {
    setTab(next);
    setOffset(0);
  }, []);

  // The open row, re-read from the page rather than kept as the snapshot the
  // click captured. A decision refetches the list, and a panel rendering the
  // pre-decision copy would still be offering Approve on an approved row.
  const openRow =
    open === null
      ? null
      : (applications.data?.items.find((row) => row.id === open.id) ?? open);

  return (
    <div className={DECK_PAGE}>
      <PageTitle subtitle="Restaurants asking to join. Each one is waiting on a person here — nothing about an application resolves itself.">
        Applications
      </PageTitle>

      <Toolbar ariaLabel="Application filters">
        <SegmentedControl
          ariaLabel="Application state"
          options={TABS}
          value={tab}
          onValueChange={changeTab}
        />
        <FilterChip
          label="Oldest first"
          tone="accent"
          title="A worklist, not a feed. Sorting the newest to the top would bury the application that has been waiting longest, which is the one failure mode a queue must not have."
        />
        <FilterChip
          label="Approving does not publish"
          tone="warn"
          title="An approved restaurant is created closed: invisible to customers until its own owner opens it, once there is a menu and a policy behind it. Nobody here has to remember to switch it on, and nobody here can."
        />
      </Toolbar>

      <QueryState
        query={applications}
        errorTitle="The application queue could not load"
        emptyTitle={EMPTY_TITLE[tab]}
        emptyDetail={EMPTY_DETAIL[tab]}
        isEmpty={(page) => page.items.length === 0}
        skeleton={
          <BoardSkeleton
            rows={6}
            label="Loading the application queue"
            note="Reading the applications…"
          />
        }
      >
        {(page) => (
          <DataTableScroll
            className={DECK_PANEL}
            footer={
              <>
                <TableFooter
                  shown={page.items.length}
                  total={page.total}
                  noun="applications"
                  sortedBy="when it was sent, oldest first"
                  extra="open a row to read it in full and answer it"
                />
                <Pagination
                  total={page.total}
                  limit={page.limit}
                  offset={page.offset}
                  onOffsetChange={setOffset}
                  noun="applications"
                  className="border-t border-line"
                />
              </>
            }
          >
            <DataTable aria-label="Restaurant applications, oldest first">
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="pl-4">
                    Restaurant
                  </DataTableHeaderCell>
                  <DataTableHeaderCell>Where</DataTableHeaderCell>
                  <DataTableHeaderCell>Applicant</DataTableHeaderCell>
                  <DataTableHeaderCell numeric>For two</DataTableHeaderCell>
                  <DataTableHeaderCell>Sent</DataTableHeaderCell>
                  <DataTableHeaderCell>State</DataTableHeaderCell>
                  <DataTableHeaderCell numeric>Read it</DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {page.items.map((row) => (
                  <DataTableRow
                    key={row.id}
                    selected={row.id === open?.id}
                    onClick={() => setOpen(row)}
                    className="cursor-pointer"
                  >
                    <DataTableCell className="max-w-[240px] pl-4 text-ink">
                      <span className="flex flex-col">
                        <span className="truncate">{row.name}</span>
                        <span className="truncate font-mono text-[12px] text-ink-3">
                          /{row.slug}
                        </span>
                      </span>
                    </DataTableCell>
                    <DataTableCell className="text-ink-2">
                      {row.area}, {row.city}
                    </DataTableCell>
                    <DataTableCell className="max-w-[200px] text-ink-2">
                      <span className="flex flex-col">
                        <span className="truncate">{row.applicant_name}</span>
                        {row.is_applicant_active ? null : (
                          <span className="text-[12px] text-warn">
                            account deactivated
                          </span>
                        )}
                      </span>
                    </DataTableCell>
                    <DataTableCell numeric className="font-mono tabular-nums">
                      {formatMoneyWhole(row.price_for_two)}
                    </DataTableCell>
                    <DataTableCell className="text-ink-2">
                      {formatDateOnly(row.created_at)}
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge status={row.status} />
                    </DataTableCell>
                    <DataTableCell numeric>
                      <RowAction
                        tone={row.status === "pending" ? "accent" : "default"}
                        title={
                          row.status === "pending"
                            ? "Read it in full and answer it"
                            : "Read it, and the answer it was given"
                        }
                        onClick={() => setOpen(row)}
                      >
                        {row.status === "pending" ? "Answer" : "Open"}
                      </RowAction>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </DataTableScroll>
        )}
      </QueryState>

      <ApplicationDrawer application={openRow} onClose={() => setOpen(null)} />
    </div>
  );
}
