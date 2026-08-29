/** Theme selection, shared by all three apps.
 *
 * tokens.css supports three states, not two: a bare `:root` light palette, a
 * `prefers-color-scheme: dark` block guarded against an explicit light choice,
 * and a `[data-theme="dark"]` block that wins over the OS. "System" is
 * therefore the ABSENCE of the attribute, not a third value written into it —
 * stamping `data-theme="system"` would match neither block and strand the page
 * on the light palette.
 */

export const THEME_STORAGE_KEY = "foodishi-theme";

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"];

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}

export function readStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(raw) ? raw : "system";
  } catch {
    // Private browsing and some embedded webviews throw on localStorage.
    return "system";
  }
}

/** Write the choice to the document. Removing the attribute restores "system". */
export function applyTheme(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

export function storeTheme(choice: ThemeChoice): void {
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* storage unavailable — the choice still applies for this page */
  }
}

/** What the page is actually painting right now, once "system" is resolved. */
export function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Runs before first paint, inlined in each app's <head>.
 *
 * Without it the document renders on the light palette for one frame and then
 * snaps to dark — the flash is worst for the people who chose dark deliberately.
 * Deliberately dependency-free and wrapped in try/catch: an exception here
 * would block the rest of the page.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;
