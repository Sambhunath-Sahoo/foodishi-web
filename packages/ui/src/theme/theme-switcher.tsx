"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  THEME_CHOICES,
  type ThemeChoice,
} from "./theme";

const LABEL: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

/** Small, legible marks. Emoji would read as decoration and scale badly. */
function Glyph({ choice }: { readonly choice: ThemeChoice }): React.JSX.Element {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (choice === "light")
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="3.1" />
        <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9L13 13M13 3l-1.1 1.1M4.1 11.9L3 13" />
      </svg>
    );
  if (choice === "dark")
    return (
      <svg {...common}>
        <path d="M13.4 9.5A5.8 5.8 0 0 1 6.5 2.6a5.9 5.9 0 1 0 6.9 6.9Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="1.6" y="2.6" width="12.8" height="8.6" rx="1.4" />
      <path d="M5.6 13.8h4.8" />
    </svg>
  );
}

export interface ThemeSwitcherProps {
  readonly className?: string;
  /** Icons only. For a dense operator header where the labels do not fit. */
  readonly compact?: boolean;
}

/**
 * Light / Dark / System, persisted across apps under one storage key.
 *
 * Rendered as a radiogroup rather than three buttons so a screen reader
 * announces the current choice, and so arrow keys move between options the way
 * they do in every other segmented control.
 *
 * Returns null until mounted: the server cannot know what localStorage holds,
 * and rendering a guess produces a hydration mismatch plus a visible flicker on
 * the control itself. The inline THEME_INIT_SCRIPT has already painted the
 * correct palette by then, so nothing else flashes.
 */
export function ThemeSwitcher({
  className,
  compact = false,
}: ThemeSwitcherProps): React.JSX.Element | null {
  const [choice, setChoice] = React.useState<ThemeChoice>("system");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const stored = readStoredTheme();
    setChoice(stored);
    applyTheme(stored);
    setMounted(true);
  }, []);

  // While on "system", follow the OS if it changes mid-session.
  React.useEffect(() => {
    if (choice !== "system" || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (): void => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);

  const pick = React.useCallback((next: ThemeChoice) => {
    setChoice(next);
    storeTheme(next);
    applyTheme(next);
  }, []);

  if (!mounted) return null;

  const active = resolveTheme(choice);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-chip border border-line bg-surface-2 p-0.5",
        className,
      )}
    >
      {THEME_CHOICES.map((option) => {
        const selected = option === choice;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={
              option === "system"
                ? `System theme (currently ${active})`
                : `${LABEL[option]} theme`
            }
            title={LABEL[option]}
            onClick={() => pick(option)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-chip px-2 py-1 text-xs font-semibold",
              "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-accent",
              selected
                ? "bg-surface text-ink shadow-card"
                : "text-ink-3 hover:text-ink-2",
            )}
          >
            <Glyph choice={option} />
            {!compact && <span>{LABEL[option]}</span>}
          </button>
        );
      })}
    </div>
  );
}
