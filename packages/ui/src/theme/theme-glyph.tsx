import * as React from "react";

import type { ThemeChoice } from "./theme";

export const THEME_LABEL: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

const STROKE = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Small, legible marks. Emoji would read as decoration and scale badly. */
export function ThemeGlyph({
  choice,
  size = 14,
}: {
  readonly choice: ThemeChoice;
  readonly size?: number;
}): React.JSX.Element {
  const common = { ...STROKE, width: size, height: size };
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

export function CheckGlyph(): React.JSX.Element {
  return (
    <svg {...STROKE} width={14} height={14} strokeWidth={1.8}>
      <path d="M3.5 8.4 6.6 11.3 12.5 4.9" />
    </svg>
  );
}
