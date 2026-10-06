"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { THEME_CHOICES, type ThemeChoice } from "./theme";
import { CheckGlyph, THEME_LABEL, ThemeGlyph } from "./theme-glyph";
import type { ThemeChoiceState } from "./use-theme-choice";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Where an arrow key, Home or End sends focus inside the three-item menu. */
function nextIndex(key: string, current: number, count: number): number | null {
  if (key === "ArrowDown") return (current + 1) % count;
  if (key === "ArrowUp") return (current - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

/**
 * The compact theme control: one icon button showing the mode in force, which
 * opens a three-item menu.
 *
 * It replaced three always-visible icons in a pill. In a dense header that pill
 * was the widest, busiest thing beside the account block, and it spent its
 * width on a setting somebody changes about once. One 32px button — the height of
 * the small Button beside it — says what is set; the menu says what else there is, in
 * words rather than in icons a reader has to decode.
 *
 * WAI-ARIA menu button: aria-haspopup / aria-expanded on the trigger, and
 * menuitemradio + aria-checked on the items, so a screen reader announces both
 * the choices and which one holds. Opening focuses the checked item, arrows and
 * Home / End move, Escape closes and hands focus back to the button, and so does
 * picking. Tabbing or clicking away closes it without stealing focus back.
 */
export function ThemeMenu({
  className,
  state,
}: {
  readonly className?: string;
  readonly state: ThemeChoiceState;
}): React.JSX.Element {
  const { choice, active, pick } = state;
  const [isOpen, setIsOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = React.useId();

  const close = React.useCallback((shouldReturnFocus: boolean) => {
    setIsOpen(false);
    if (shouldReturnFocus) buttonRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    itemRefs.current[THEME_CHOICES.indexOf(choice)]?.focus();
  }, [isOpen, choice]);

  // A pointer anywhere else closes it. Focus is left where the click put it.
  React.useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen, close]);

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === "Tab") {
      close(false);
      return;
    }
    const current = itemRefs.current.findIndex((item) => item === document.activeElement);
    const target = nextIndex(event.key, current, THEME_CHOICES.length);
    if (target === null) return;
    event.preventDefault();
    itemRefs.current[target]?.focus();
  };

  const onButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    setIsOpen(true);
  };

  const choose = (option: ThemeChoice): void => {
    pick(option);
    close(true);
  };

  const current = THEME_LABEL[choice];
  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Theme: ${current}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        title={choice === "system" ? `Theme: System (${active} now)` : `Theme: ${current}`}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={onButtonKeyDown}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-card border border-line bg-surface text-ink-2",
          "transition-colors hover:bg-surface-2 hover:text-ink",
          isOpen && "bg-surface-2 text-ink",
          FOCUS_RING,
        )}
      >
        <ThemeGlyph choice={choice} size={16} />
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Colour theme"
          onKeyDown={onMenuKeyDown}
          className="absolute top-full right-0 z-40 mt-1.5 flex min-w-[148px] flex-col gap-0.5 rounded-card border border-line bg-surface p-1 shadow-card"
        >
          {THEME_CHOICES.map((option, index) => {
            const isChecked = option === choice;
            return (
              <button
                key={option}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isChecked}
                tabIndex={-1}
                onClick={() => choose(option)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-card px-2.5 py-1.5 text-left font-sans text-[13px]",
                  "transition-colors hover:bg-surface-2 focus-visible:bg-surface-2",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                  isChecked ? "font-medium text-ink" : "text-ink-2",
                )}
              >
                <ThemeGlyph choice={option} />
                <span className="flex-1">{THEME_LABEL[option]}</span>
                {/* The check, not colour alone, marks the choice in force. */}
                <span className={cn("text-accent", !isChecked && "invisible")}>
                  <CheckGlyph />
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
