"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthSpinner } from "@repo/api-client";
import { ORDER_STATUSES, PageTitle, SegmentedControl } from "@repo/ui";
import { HistoryBoard } from "./history-board";
import { KanbanBoard } from "./kanban-board";
import { LiveBoard } from "./live-board";
import { KitchenGate } from "../_components/kitchen-gate";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { OrderStatus } from "../../lib/types";

type Tab = "live" | "history";

const TABS: readonly { readonly value: Tab; readonly label: string }[] = [
  { value: "live", label: "Live" },
  { value: "history", label: "History" },
];

/**
 * Two ways to read the same live queue.
 *
 * The list is sorted by urgency and answers "what is the next thing to do".
 * The board groups by stage and answers "where is everything, and is anything
 * piling up". Neither replaces the other, so both stay and the choice is
 * remembered.
 */
type View = "list" | "board";

const VIEWS: readonly { readonly value: View; readonly label: string }[] = [
  { value: "list", label: "List" },
  { value: "board", label: "Board" },
];

/**
 * Remembered per device, not per session: a kitchen that works off the board
 * wants the board every shift, and a reload mid-service must not throw them
 * back to the list.
 */
const VIEW_STORAGE_KEY = "foodishi.partner.orders-view.v1";

function useRememberedView(): readonly [View, (next: View) => void] {
  const [view, setView] = React.useState<View>("list");

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored === "board" || stored === "list") setView(stored);
    } catch {
      // Storage blocked. The list default is a fine place to land.
    }
  }, []);

  const choose = React.useCallback((next: View): void => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Losing the preference must not lose the switch.
    }
  }, []);

  return [view, choose] as const;
}

const STATUSES: ReadonlySet<string> = new Set(ORDER_STATUSES);

/** `?status=` arrives from the URL, so it is checked against the real list. */
function readStatus(raw: string | null): OrderStatus | null {
  return raw !== null && STATUSES.has(raw) ? (raw as OrderStatus) : null;
}

function Orders({ kitchen }: { readonly kitchen: ReadyKitchen }): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = readStatus(searchParams.get("status"));
  // Live by default. A `?status=` link from the dashboard is asking about the
  // live queue, and this is the tab that answers it.
  const [tab, setTab] = React.useState<Tab>("live");

  const setStatus = React.useCallback(
    (next: OrderStatus | null): void => {
      // Written back to the URL rather than kept in state, so the filter
      // survives a reload and can be sent to somebody else.
      router.replace(next === null ? "/orders" : `/orders?status=${next}`);
    },
    [router],
  );

  const canSeeHistory = kitchen.can("orders.history");
  const [view, setView] = useRememberedView();
  const isLive = tab === "live" || !canSeeHistory;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {canSeeHistory ? (
          <SegmentedControl
            ariaLabel="Which orders"
            options={TABS}
            value={tab}
            onValueChange={setTab}
          />
        ) : (
          <span />
        )}

        {/* Only on Live. History is a table of settled orders; a board of
            things that have already left the queue has no stages to show. */}
        {isLive ? (
          <SegmentedControl
            ariaLabel="How to show the live queue"
            options={VIEWS}
            value={view}
            onValueChange={setView}
          />
        ) : null}
      </div>

      {isLive ? (
        view === "board" ? (
          <KanbanBoard kitchen={kitchen} status={status} onStatusChange={setStatus} />
        ) : (
          <LiveBoard kitchen={kitchen} status={status} onStatusChange={setStatus} />
        )
      ) : (
        <HistoryBoard kitchen={kitchen} />
      )}
    </div>
  );
}

/**
 * Live and past orders, on one screen with two tabs.
 *
 * Two tabs rather than two routes because they are one job — "what is happening
 * with our orders" — and because a manager who has just cancelled a ticket
 * checks the history for it in the next breath. Two URLs would make that a
 * navigation.
 *
 * `useSearchParams` has to sit under a Suspense boundary or Next cannot
 * prerender this route at all.
 */
export default function OrdersPage(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle subtitle="Everything in the kitchen right now, and everything it has taken before.">
        Orders
      </PageTitle>

      <React.Suspense fallback={<AuthSpinner label="Opening the orders board" />}>
        <KitchenGate loadingLabel="Loading orders" requires="orders.view">
          {(kitchen) => <Orders kitchen={kitchen} />}
        </KitchenGate>
      </React.Suspense>
    </div>
  );
}
