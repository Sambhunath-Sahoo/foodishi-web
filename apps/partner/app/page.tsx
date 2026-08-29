"use client";

import * as React from "react";
import { PageTitle } from "@repo/ui";
import { KitchenGate } from "./_components/kitchen-gate";
import { ManagerDashboard } from "./_dashboard/manager-dashboard";
import { StaffDashboard } from "./_dashboard/staff-dashboard";
import type { ReadyKitchen } from "../lib/kitchen";

/**
 * Two dashboards, chosen by what this person can actually see.
 *
 * Not by role. The switch is `reports.view` — the permission that decides
 * whether there is any money on this screen to show — so a kitchen that one day
 * grants a senior cook the reports gets the manager's dashboard for them
 * without a line changing here. Asking `role === "manager"` would have made
 * that a code change.
 *
 * The two are not the same screen with cells hidden. The staff dashboard is a
 * work queue; the manager's is a work queue with the day's trade under it.
 */
function Dashboard({ kitchen }: { readonly kitchen: ReadyKitchen }): React.JSX.Element {
  return kitchen.can("reports.view") ? (
    <ManagerDashboard kitchen={kitchen} />
  ) : (
    <StaffDashboard kitchen={kitchen} />
  );
}

function subtitleFor(kitchen: ReadyKitchen): string {
  return kitchen.can("reports.view")
    ? "What is happening right now, and how the day is going."
    : "What is happening right now, and what is waiting on you.";
}

export default function DashboardPage(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <KitchenGate loadingCards={2} loadingLabel="Opening your restaurant">
        {(kitchen) => (
          <>
            <PageTitle subtitle={subtitleFor(kitchen)}>Dashboard</PageTitle>
            <Dashboard kitchen={kitchen} />
          </>
        )}
      </KitchenGate>
    </div>
  );
}
