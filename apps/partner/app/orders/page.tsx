"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AuthSpinner } from "@repo/api-client";
import { ORDER_STATUSES, PageTitle, SegmentedControl } from "@repo/ui";
import { HistoryBoard } from "./history-board";
import { KanbanBoard } from "./kanban-board";
import { LiveBoard } from "./live-board";
import { QueueFilters, readQueueFilter } from "./queue-filters";
import { KitchenGate } from "../_components/kitchen-gate";
import { excludeStale } from "../_lib/lateness";
import { TICK_QUEUE_MS, useNow } from "../_lib/use-now";
import { useLiveOrders } from "../../lib/queries/orders";
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
 * kept in the URL.
 */
type View = "list" | "board";

const VIEWS: readonly { readonly value: View; readonly label: string }[] = [
  { value: "list", label: "List" },
  { value: "board", label: "Board" },
];

/**
 * Remembered per device as a fallback, not per session: a kitchen that works
 * off the board wants the board every shift. The URL wins whenever it says —
 * so a reload, the back button and a shared link all land on the same view.
 */
const VIEW_STORAGE_KEY = "foodishi.partner.orders-view.v1";

function readStoredView(): View | null {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return stored === "board" || stored === "list" ? stored : null;
  } catch {
    // Storage blocked. The list default is a fine place to land.
    return null;
  }
}

function storeView(view: View): void {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Losing the preference must not lose the switch.
  }
}

const STATUSES: ReadonlySet<string> = new Set(ORDER_STATUSES);

/** `?status=` arrives from the URL, so it is checked against the real list. */
function readStatus(raw: string | null): OrderStatus | null {
  return raw !== null && STATUSES.has(raw) ? (raw as OrderStatus) : null;
}

function readTab(raw: string | null): Tab {
  return raw === "history" ? "history" : "live";
}

function readView(raw: string | null): View | null {
  return raw === "board" || raw === "list" ? raw : null;
}

/** Defaults stay out of the URL, so plain `/orders` is still the live list. */
const DEFAULTS: Readonly<Record<string, string>> = {
  tab: "live",
  view: "list",
  filter: "all",
};

/**
 * Publishes this page's sticky filter row height as `--partner-subheader-h`.
 *
 * The shell publishes the header's own height (`--partner-header-h`, see
 * app-shell.tsx); `scroll-padding-top` in globals.css adds the two, so a
 * focused card stays clear of the header and of this row.
 */
function useStickyOffsets(rowRef: React.RefObject<HTMLDivElement | null>): void {
  React.useLayoutEffect(() => {
    const root = document.documentElement;
    const row = rowRef.current;
    if (row === null) return;

    const measure = (): void => {
      root.style.setProperty("--partner-subheader-h", `${row.getBoundingClientRect().height}px`);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => {
      observer.disconnect();
      // Other routes have no sticky row of their own.
      root.style.removeProperty("--partner-subheader-h");
    };
  }, [rowRef]);
}

function Orders({ kitchen }: { readonly kitchen: ReadyKitchen }): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const now = useNow(TICK_QUEUE_MS);
  const rowRef = React.useRef<HTMLDivElement | null>(null);
  useStickyOffsets(rowRef);

  const status = readStatus(searchParams.get("status"));
  // Live by default. A `?status=` link from the dashboard is asking about the
  // live queue, and this is the tab that answers it.
  const tab = readTab(searchParams.get("tab"));
  const filter = readQueueFilter(searchParams.get("filter"));

  // The URL is read on the server too, where storage does not exist; the
  // stored view is picked up after mount.
  const [storedView, setStoredView] = React.useState<View | null>(null);
  React.useEffect(() => {
    setStoredView(readStoredView());
  }, []);
  const view = readView(searchParams.get("view")) ?? storedView ?? "list";

  /** Every choice on this screen is written back to the URL, never to state. */
  const setParam = React.useCallback(
    (key: string, value: string | null): void => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === null || value === DEFAULTS[key]) next.delete(key);
      else next.set(key, value);
      const query = next.toString();
      router.replace(query === "" ? pathname : `${pathname}?${query}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setStatus = React.useCallback(
    (next: OrderStatus | null): void => setParam("status", next),
    [setParam],
  );

  const canSeeHistory = kitchen.can("orders.history");
  const isLive = tab === "live" || !canSeeHistory;
  const showsFilters = isLive && view === "list";
  // Read here as well as in the list: the filter row sits in the sticky bar
  // above it, and React Query hands both the same cached request.
  const queue = useLiveOrders(kitchen);

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky under the shell's header, so the tabs and the filters are
          still there two screens down a long service. */}
      <div
        ref={rowRef}
        className="sticky top-[var(--partner-header-h,103px)] z-20 -mx-1 flex flex-col gap-3 bg-bg px-1 py-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          {canSeeHistory ? (
            <SegmentedControl
              ariaLabel="Which orders"
              options={TABS}
              value={tab}
              onValueChange={(next) => setParam("tab", next)}
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
              onValueChange={(next) => {
                storeView(next);
                setParam("view", next);
              }}
            />
          ) : null}
        </div>

        {showsFilters ? (
          <QueueFilters
            orders={queue.data === undefined ? undefined : excludeStale(queue.data.items, now)}
            now={now}
            value={filter}
            onValueChange={(next) => setParam("filter", next)}
          />
        ) : null}
      </div>

      {isLive ? (
        view === "board" ? (
          <KanbanBoard kitchen={kitchen} status={status} onStatusChange={setStatus} />
        ) : (
          <LiveBoard
            kitchen={kitchen}
            status={status}
            onStatusChange={setStatus}
            filter={filter}
          />
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
