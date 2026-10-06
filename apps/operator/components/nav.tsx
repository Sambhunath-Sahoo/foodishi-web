"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, TONE_DOT, TONE_TEXT, type Tone } from "@repo/ui";
import { formatCount, formatMoneyWhole } from "../lib/format";
import { isNavCollapsed, setNavCollapsed } from "../lib/nav-collapse";
import { useActiveRides, useLiveOrders, useWorkload } from "../lib/queries";
import { tallyLate } from "../lib/sla";
import { useNow } from "../lib/use-now";
import type { Workload } from "../lib/services/types";
import { NavIcon, type NavIconName } from "./nav-icons";

/**
 * The section rail, which reports.
 *
 * The version this replaced was twelve identical two-line rows of grey text: a
 * label, and under it a question like "Which refunds are late". Thirty lines of
 * small type in 236px, and not one of them answered its own question — you had
 * to open the section to find out. Meanwhile fourteen refunds were past the time
 * a customer was promised their money and the rail said nothing.
 *
 * Three changes, and each one is the same argument:
 *
 *   The question copy is gone. It is onboarding text, and onboarding text does
 *   not deserve to live permanently in the chrome once a live figure can have
 *   the space.
 *
 *   Every section that has something to say now says it — the count, and the
 *   word for what it counts, in the tone the thing deserves. Six of the twelve
 *   have a figure; the other six show nothing at all, because a badge on a
 *   section nobody has to act on teaches the reader to ignore the ones that
 *   matter.
 *
 *   The uppercase group headings became hairlines with the group name sitting in
 *   them, which returns a line of vertical space per group and stops six grey
 *   capitals competing with twelve section names.
 *
 * Collapsing takes it to a 56px icon rail. The figures survive as pips, so the
 * narrow rail still tells you where the work is — see `lib/nav-collapse.ts` for
 * why the width is an attribute on `<html>` and not React state.
 */

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: NavIconName;
  /**
   * The one figure this section is worth interrupting somebody for, or null.
   * Reads the whole workload so a section can build its own phrase.
   */
  readonly figure?: (workload: Workload, queue: LiveQueue) => Figure | null;
}

/**
 * The live queue as the board itself counts it: in flight, less stuck.
 *
 * `workload.live_orders` is the server's count of everything in flight, and on
 * a platform with six-week-old orders that never expired it said "36 in flight"
 * while the board's queue was empty (OP-3). The server has no notion of stuck
 * yet (AD-2), so the rail counts from the same cached live-orders query the
 * board reads — one request shared, not a second one. Undefined until it lands,
 * so the badge never flashes the server's larger number first.
 */
interface LiveQueue {
  readonly inFlight: number | undefined;
  readonly stuck: number | undefined;
  /**
   * The same split for rides on the road. `workload.deliveries_late` counts a
   * six-week-old ride as late, so the rail said "13 late" over a deliveries
   * board with nothing a rider could still fix (OP-3).
   */
  readonly ridesLate: number | undefined;
  readonly ridesStuck: number | undefined;
}

interface Figure {
  readonly count: number;
  /** Two or three words. It has to fit beside the label at 236px. */
  readonly unit: string;
  readonly tone: Tone;
  /** The sentence behind the number, on hover. */
  readonly hint: string;
}

interface NavGroup {
  readonly title: string;
  readonly items: readonly NavItem[];
}

const NAV_GROUPS: readonly NavGroup[] = [
  {
    title: "Operations",
    items: [
      { href: "/", label: "Overview", icon: "overview" },
      {
        href: "/live",
        label: "Live board",
        icon: "live",
        // Mute, not cool: cool means "out for delivery" (DESIGN.md), and most
        // of what is in flight is still in a kitchen (OP-7).
        figure: (_workload, queue) =>
          queue.inFlight === undefined || queue.inFlight === 0
            ? null
            : {
                count: queue.inFlight,
                unit: "in flight",
                tone: "mute",
                hint:
                  (queue.stuck ?? 0) > 0
                    ? `${formatCount(queue.inFlight)} orders are somewhere between placed and handed over. ${formatCount(queue.stuck ?? 0)} more are stuck over six hours past their promise and are listed separately on the board.`
                    : `${formatCount(queue.inFlight)} orders are somewhere between placed and handed over.`,
              },
      },
      { href: "/orders", label: "Orders", icon: "orders" },
      {
        href: "/deliveries",
        label: "Deliveries",
        icon: "deliveries",
        figure: (workload, queue) => deliveriesFigure(workload.deliveries_out, queue),
      },
    ],
  },
  {
    title: "Partners & people",
    items: [
      {
        href: "/restaurants",
        label: "Restaurants",
        icon: "restaurants",
        figure: (workload) =>
          workload.restaurants_slipping === 0
            ? null
            : {
                count: workload.restaurants_slipping,
                unit: "slipping",
                tone: "warn",
                hint: "These kitchens take longer end to end than the prep time they promise on, so every promise built on it runs late.",
              },
      },
      {
        href: "/applications",
        label: "Applications",
        icon: "applications",
        figure: (workload) =>
          // Not `=== 0`. An API that predates this figure sends no such field,
          // and `formatCount(undefined)` printed "NaN WAITING" into the
          // navigation on every page — a badge that cannot be acted on, beside
          // eleven that can. Absent and zero are the same answer here: nothing
          // to do.
          !Number.isFinite(workload.applications_pending) ||
          workload.applications_pending === 0
            ? null
            : {
                count: workload.applications_pending,
                unit: "waiting",
                // Mute: nobody's dinner is late and no money is held. It is a
                // restaurant that cannot trade until somebody at Foodishi reads
                // their form — pending, in DESIGN.md's words. Warn is kept for
                // a running clock (OP-7).
                tone: "mute",
                hint: "Restaurants asking to join. Each one is waiting on a person here — nothing about an application resolves itself.",
              },
      },
      { href: "/customers", label: "Customers", icon: "customers" },
    ],
  },
  {
    title: "Growth",
    items: [
      {
        href: "/offers",
        label: "Offers",
        icon: "offers",
        figure: (workload) =>
          workload.coupons_exhausted === 0
            ? null
            : {
                count: workload.coupons_exhausted,
                unit: "exhausted",
                tone: "crit",
                hint: "Codes at their cap. A customer can still type one in — and it is refused at checkout.",
              },
      },
    ],
  },
  {
    title: "Money",
    items: [
      {
        href: "/payments",
        label: "Payments",
        icon: "payments",
        figure: (workload) =>
          workload.payments_failed === 0
            ? null
            : {
                count: workload.payments_failed,
                unit: "failed",
                // Failed is crit in DESIGN.md; warn means a clock is running.
                tone: "crit",
                hint: "Payment attempts that never went through. Each one is a customer who tried to pay and could not.",
              },
      },
      {
        href: "/sla",
        label: "Refunds",
        icon: "refunds",
        figure: (workload) =>
          workload.refunds_breached === 0
            ? null
            : {
                count: workload.refunds_breached,
                unit: "overdue",
                tone: "crit",
                hint: `${formatMoneyWhole(workload.refunds_owed)} is owed back on refunds already past the time the customer was promised it.`,
              },
      },
      { href: "/revenue", label: "Revenue", icon: "revenue" },
    ],
  },
  {
    title: "Insight",
    items: [{ href: "/reports", label: "Reports", icon: "reports" }],
  },
  {
    title: "Platform",
    items: [{ href: "/settings", label: "Settings", icon: "settings" }],
  },
];

/**
 * Rides out, and of those the ones late enough to chase.
 *
 * Only rides inside six hours of their promise are "late" and red; stuck ones
 * are said separately in the unit's neutral ink, because nobody on the road can
 * fix them. Until the ride rows land the badge says "on the road" rather than
 * flash the server's late count, which includes the stuck ones.
 */
function deliveriesFigure(out: number, queue: LiveQueue): Figure | null {
  if (out === 0) return null;
  const late = queue.ridesLate ?? 0;
  const stuck = queue.ridesStuck ?? 0;
  const stuckNote =
    stuck > 0
      ? ` ${formatCount(stuck)} more are stuck over six hours past their promise — a refund decision, not a rider.`
      : "";

  if (late > 0) {
    return {
      count: out,
      unit: `out · ${formatCount(late)} late`,
      tone: "crit",
      hint: `${formatCount(late)} of the ${formatCount(out)} rides out are already past what the customer was promised.${stuckNote}`,
    };
  }
  if (stuck > 0) {
    return {
      count: out,
      unit: `out · ${formatCount(stuck)} stuck`,
      // Mute, not crit: a stuck ride is a money decision with no clock a rider
      // can beat, so it must not borrow the colour of a late one.
      tone: "mute",
      hint: `None of the ${formatCount(out)} rides out is late enough to chase.${stuckNote}`,
    };
  }
  return {
    count: out,
    unit: "on the road",
    tone: "cool",
    hint: `${formatCount(out)} rides are out and every one of them is inside its promise.`,
  };
}

function isCurrent(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * The count, and the word for what it counts.
 *
 * Mono and tabular so a column of figures lines up down the rail, and the unit
 * at 10px uppercase so the number is what the eye lands on. Only the number
 * takes the tone — a whole row in `--crit` would shout down the eleven sections
 * that are fine.
 */
function NavFigure({ figure }: { readonly figure: Figure }): React.JSX.Element {
  return (
    <span className="nav-hide-collapsed flex shrink-0 items-baseline gap-1">
      <span
        className={cn(
          "font-mono text-[12px] leading-none font-semibold tabular-nums",
          TONE_TEXT[figure.tone],
        )}
      >
        {formatCount(figure.count)}
      </span>
      <span className="font-sans text-[10px] leading-none tracking-[0.03em] whitespace-nowrap uppercase text-ink-3">
        {figure.unit}
      </span>
    </span>
  );
}

export function Nav(): React.JSX.Element {
  const pathname = usePathname();
  const workload = useWorkload();
  const data = workload.data;
  const liveOrders = useLiveOrders();
  const activeRides = useActiveRides();
  const nowMs = useNow();
  const queue = React.useMemo<LiveQueue>(() => {
    const items = liveOrders.data?.items;
    const rides = activeRides.data?.items;
    const orderTally =
      items === undefined || nowMs === null ? undefined : tallyLate(items, nowMs);
    const rideTally =
      rides === undefined || nowMs === null
        ? undefined
        : tallyLate(
            rides.map((row) => row.order),
            nowMs,
          );
    return {
      inFlight:
        items === undefined || orderTally === undefined
          ? undefined
          : items.length - orderTally.stuck,
      stuck: orderTally?.stuck,
      ridesLate: rideTally?.late,
      ridesStuck: rideTally?.stuck,
    };
  }, [liveOrders.data, activeRides.data, nowMs]);

  // Mirrors the attribute the pre-paint script set, for the button's own label.
  // The layout does not read this — the stylesheet does — so a first render
  // that has not caught up yet cannot move anything.
  const [collapsed, setCollapsed] = React.useState(false);
  React.useEffect(() => {
    setCollapsed(isNavCollapsed());
  }, []);

  const toggle = React.useCallback(() => {
    const next = !isNavCollapsed();
    setNavCollapsed(next);
    setCollapsed(next);
  }, []);

  return (
    <aside
      className={cn(
        "nav-rail flex shrink-0 flex-col border-b border-line bg-surface",
        "md:overflow-y-auto md:border-b-0 md:border-r",
      )}
    >
      {/* The rail's own control sits at its head, not buried under twelve items
          somebody has to scroll past — and not in the bottom-left corner, where
          at 56px it lands under the dev overlay's own badge. */}
      <div className="hidden shrink-0 justify-end px-2 pt-2 md:flex">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          title={collapsed ? "Show the section names" : "Collapse to icons"}
          className={cn(
            "nav-item flex items-center gap-2 rounded-card px-2 py-1",
            "font-sans text-[11px] tracking-[0.06em] uppercase text-ink-3 transition-colors",
            "hover:bg-surface-2 hover:text-ink-2",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          <span className="nav-label">{collapsed ? "Expand" : "Collapse"}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("size-4 shrink-0 transition-transform", collapsed && "rotate-180")}
          >
            <path d="M9.5 4 5.5 8l4 4" />
            <path d="M13 2.5v11" />
          </svg>
        </button>
      </div>

      <nav aria-label="Sections" className="flex flex-col gap-2.5 px-2 pb-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5">
            {/* A hairline with the group name in it, rather than a fifth line of
                uppercase grey. On the collapsed rail the name goes and the rule
                stays, because the grouping is still worth seeing. */}
            <p
              className={cn(
                "mx-2 mt-1.5 mb-1 flex items-center gap-2",
                "font-sans text-[10px] font-bold tracking-[0.1em] uppercase text-ink-3",
              )}
            >
              <span className="nav-label">{group.title}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-line" />
            </p>

            {group.items.map((item) => {
              const current = isCurrent(pathname, item.href);
              const figure =
                data === undefined ? null : (item.figure?.(data, queue) ?? null);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  title={figure?.hint ?? item.label}
                  className={cn(
                    "nav-item relative flex items-center gap-2.5 rounded-card px-2 py-1.5",
                    "font-sans text-[13px] transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    current
                      ? "bg-accent-soft font-semibold text-accent"
                      : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  {/* The current page gets the accent rule as well as the tint,
                      so it reads as a place and not only as a highlight. */}
                  {current ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1.5 -left-2 w-[3px] rounded-r-chip bg-accent"
                    />
                  ) : null}

                  <span className="relative shrink-0">
                    <NavIcon name={item.icon} />
                    {figure === null ? null : (
                      <span
                        aria-hidden="true"
                        className={cn(
                          // Shown only on the collapsed rail — beside a written
                          // figure it would be the same fact twice. The rule
                          // lives in globals.css with the other width rules.
                          "nav-pip absolute -top-0.5 -right-1 size-1.5 rounded-chip",
                          "ring-1 ring-surface",
                          TONE_DOT[figure.tone],
                        )}
                      />
                    )}
                  </span>

                  <span className="nav-label min-w-0 flex-1 truncate">{item.label}</span>
                  {figure === null ? null : <NavFigure figure={figure} />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* What the rail is for, in one line: the worst number on the platform and
          the money behind it. Sits at the bottom so it is the last thing read
          before the eye moves to the board. */}
      {data === undefined || data.refunds_breached === 0 ? null : (
        <p className="nav-hide-collapsed mx-2 mb-3 hidden border-t border-line pt-2.5 font-sans text-[12px] leading-snug text-ink-3 md:block">
          <Link
            href="/sla"
            className="font-semibold text-crit underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {formatMoneyWhole(data.refunds_owed)}
          </Link>{" "}
          is owed back on {formatCount(data.refunds_breached)} refunds past their
          promise.
        </p>
      )}

    </aside>
  );
}
