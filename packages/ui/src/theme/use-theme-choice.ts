"use client";

import * as React from "react";

import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  type ThemeChoice,
} from "./theme";

export interface ThemeChoiceState {
  readonly choice: ThemeChoice;
  /** What is painting right now, once "system" is resolved against the OS. */
  readonly active: "light" | "dark";
  /**
   * False until the stored choice has been read. The server cannot know what
   * localStorage holds, so anything that renders the choice waits for this
   * rather than guessing and mismatching on hydration.
   */
  readonly isMounted: boolean;
  readonly pick: (next: ThemeChoice) => void;
}

/**
 * The state behind both shapes of the theme control — the labelled segments and
 * the compact menu — so they cannot disagree about what is stored or applied.
 */
export function useThemeChoice(): ThemeChoiceState {
  const [choice, setChoice] = React.useState<ThemeChoice>("system");
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    const stored = readStoredTheme();
    setChoice(stored);
    applyTheme(stored);
    setIsMounted(true);
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

  return { choice, active: resolveTheme(choice), isMounted, pick };
}
