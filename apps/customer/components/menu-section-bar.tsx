"use client";

import * as React from "react";
import { cn } from "@repo/ui";
import { BELOW_APP_HEADER } from "../lib/app-column";

export interface MenuSectionLink {
  /** The section element's id; the chip scrolls it into view. */
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

/**
 * The menu's table of contents, docked under the app header.
 *
 * A long menu used to be one scroll with nothing to say where Sides started.
 * The chip for the section on screen is filled and bold — weight and fill, not
 * colour alone — and the row scrolls itself so that chip is never off the edge.
 * The page itself never scrolls sideways; only this row does (DESIGN.md #4).
 */
export function MenuSectionBar({
  sections,
  activeId,
  onSelect,
}: {
  readonly sections: readonly MenuSectionLink[];
  readonly activeId: string | null;
  readonly onSelect: (id: string) => void;
}): React.JSX.Element | null {
  const rowRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (activeId === null) return;
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-section="${activeId}"]`);
    if (row === null || row === undefined || chip === null || chip === undefined) return;
    // scrollIntoView would also move the page; only the row should move.
    row.scrollTo({
      left: chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [activeId]);

  if (sections.length < 2) return null;

  return (
    <nav
      aria-label="Menu sections"
      data-menu-section-bar=""
      className={cn(
        BELOW_APP_HEADER,
        "sticky z-20 -mx-4 border-b border-line bg-bg/95 backdrop-blur",
      )}
    >
      <div
        ref={rowRef}
        className="flex gap-2 overflow-x-auto px-4 py-1.5 [scrollbar-width:none]"
      >
        {sections.map((section) => {
          const isActive = section.id === activeId;
          return (
            <button
              key={section.id}
              type="button"
              data-section={section.id}
              aria-current={isActive ? "true" : undefined}
              onClick={() => onSelect(section.id)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-chip border px-3.5 text-[13px] whitespace-nowrap transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
                isActive
                  ? "border-accent bg-accent font-semibold text-on-accent"
                  : "border-line bg-surface font-medium text-ink-2 hover:border-line-2",
              )}
            >
              {section.label}
              <span className={cn("tabular-nums", isActive ? "text-on-accent" : "text-ink-3")}>
                {section.count}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Slack under the chip bar, so a section that has just docked counts as current. */
const DOCK_SLACK_PX = 8;

/**
 * Which section is under the chip bar right now. A section counts as current
 * once its top has passed the bottom of the chip bar, which is the line the
 * reader's eye is on; the last one to cross wins. The bar's bottom is read
 * live rather than assumed, so a taller header or bar cannot put it off.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const key = ids.join("|");

  React.useEffect(() => {
    if (ids.length === 0) return;
    const pick = (): void => {
      const bar = document.querySelector("[data-menu-section-bar]");
      const line = (bar?.getBoundingClientRect().bottom ?? 0) + DOCK_SLACK_PX;
      let current: string | null = ids[0] ?? null;
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element === null) continue;
        if (element.getBoundingClientRect().top <= line) current = id;
      }
      setActiveId(current);
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => {
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
    // `key` stands in for `ids`, which is a fresh array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return activeId;
}
