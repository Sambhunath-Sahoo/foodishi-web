"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { THEME_CHOICES } from "./theme";
import { THEME_LABEL, ThemeGlyph } from "./theme-glyph";
import { ThemeMenu } from "./theme-menu";
import { useThemeChoice } from "./use-theme-choice";

export interface ThemeSwitcherProps {
  readonly className?: string;
  /**
   * One icon button that opens a menu, for a dense header. Without it the
   * control is three labelled segments, for a settings page or a sign-in screen
   * where there is room to say the words.
   */
  readonly compact?: boolean;
}

/**
 * Light / Dark / System, persisted across apps under one storage key.
 *
 * The labelled shape is a radiogroup rather than three buttons, so a screen
 * reader announces the current choice and arrow keys move between options the
 * way they do in every other segmented control. Its buttons are the root's
 * direct children on purpose: callers stretch them with `[&>button]:flex-1`.
 *
 * Returns nothing until mounted: the server cannot know what localStorage holds,
 * and rendering a guess produces a hydration mismatch plus a visible flicker on
 * the control itself. The inline THEME_INIT_SCRIPT has already painted the
 * correct palette by then, so nothing else flashes. The compact shape holds its
 * 32px box meanwhile, so the header beside it does not shuffle on load.
 */
export function ThemeSwitcher({
  className,
  compact = false,
}: ThemeSwitcherProps): React.JSX.Element | null {
  const state = useThemeChoice();

  if (!state.isMounted) {
    return compact ? (
      <span aria-hidden="true" className={cn("inline-block size-8", className)} />
    ) : null;
  }
  if (compact) return <ThemeMenu className={className} state={state} />;

  const { choice, active, pick } = state;
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        // No border on the track: the raised segment is the figure, and a
        // ruled track around it was a second outline saying the same thing.
        "inline-flex items-center gap-0.5 rounded-card bg-surface-2 p-0.5",
        className,
      )}
    >
      {THEME_CHOICES.map((option) => {
        const isSelected = option === choice;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={
              option === "system"
                ? `System theme (currently ${active})`
                : `${THEME_LABEL[option]} theme`
            }
            onClick={() => pick(option)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-card px-3 py-1.5 font-sans text-[13px] font-medium",
              "transition-colors focus-visible:outline-2 focus-visible:outline-offset-1",
              "focus-visible:outline-accent",
              // ink-2, not ink-3, for the options not chosen: they are choices
              // to read, not disabled ones. The chosen one is raised — surface,
              // shadow and a hairline, because in the dark palette the surface
              // sits darker than the track and a shadow alone vanishes.
              isSelected
                ? "bg-surface text-ink shadow-card ring-1 ring-line-2"
                : "text-ink-2 hover:text-ink",
            )}
          >
            <ThemeGlyph choice={option} />
            <span>{THEME_LABEL[option]}</span>
          </button>
        );
      })}
    </div>
  );
}
