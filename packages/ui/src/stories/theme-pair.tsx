import * as React from "react";

/**
 * Story helper: the same markup on both grounds, side by side.
 *
 * tokens.css declares the light palette on `:root` and the dark one under
 * `[data-theme="dark"]`, so a nested dark pane is a one-attribute job while a
 * nested light pane simply inherits the root. Every story that uses this pair
 * therefore pins the Storybook theme global to `light`, which is what keeps
 * the left pane light when the toolbar or the OS is in dark mode.
 *
 * Not exported from the package — this is scaffolding for the canvas.
 */

export interface ThemePairProps {
  readonly children: React.ReactNode;
  /** Stack instead of side-by-side, for wide subjects like a board. */
  readonly stacked?: boolean;
}

export function ThemePair({
  children,
  stacked = false,
}: ThemePairProps): React.JSX.Element {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: stacked ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))",
        gap: "16px",
      }}
    >
      <ThemePane theme="light">{children}</ThemePane>
      <ThemePane theme="dark">{children}</ThemePane>
    </div>
  );
}

interface ThemePaneProps {
  readonly theme: "light" | "dark";
  readonly children: React.ReactNode;
}

function ThemePane({ theme, children }: ThemePaneProps): React.JSX.Element {
  return (
    <div
      data-theme={theme}
      style={{
        minWidth: 0,
        background: "var(--bg)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "var(--ink-4)",
        }}
      >
        {theme}
      </span>
      {children}
    </div>
  );
}

/** Pin the canvas to light so the light pane of a `ThemePair` stays light. */
export const PAIR_GLOBALS = { theme: "light" } as const;
