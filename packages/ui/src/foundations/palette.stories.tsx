import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Tone } from "../status/tone";
import { Chip } from "../patterns/pattern-bits";
import { FoundationCanvas, FoundationGroup } from "./foundation-canvas";
import { useTokenValues } from "./use-token-values";

interface Swatch {
  readonly name: string;
  readonly means: string;
  /** Renders a live chip in this tone under the swatch. */
  readonly tone?: Tone;
  readonly example?: string;
}

interface SwatchGroup {
  readonly title: string;
  readonly note: string;
  readonly tokens: readonly Swatch[];
}

const GROUPS: readonly SwatchGroup[] = [
  {
    title: "Ink",
    note: "four weights of text, never a fifth",
    tokens: [
      { name: "--ink", means: "Primary text, table values, the total on a bill" },
      { name: "--ink-2", means: "Secondary text — item options, banner body copy" },
      { name: "--ink-3", means: "Column labels, captions, the customer column" },
      { name: "--ink-4", means: "Faint — disabled, placeholder, “Unassigned”" },
    ],
  },
  {
    title: "Ground",
    note: "page, surface, hover and the two hairlines",
    tokens: [
      { name: "--bg", means: "The page itself, behind every card" },
      { name: "--surface", means: "Cards, panels, table body, the segmented thumb" },
      { name: "--surface-2", means: "Table head, row hover, the segmented rest state" },
      { name: "--line", means: "Hairline between rows and around a card" },
      { name: "--line-2", means: "Heavier rule: above a total, around an outline button" },
    ],
  },
  {
    title: "Neel — the accent",
    note: "structural, not semantic; it never means “good”",
    tokens: [
      {
        name: "--accent",
        means: "Links, primary buttons, focus rings, selected nav",
        tone: "accent",
        example: "Confirmed",
      },
      { name: "--accent-hover", means: "Primary button under the cursor" },
      { name: "--accent-soft", means: "Soft ground: selected row, the note panel" },
      { name: "--on-accent", means: "Text sitting on a filled accent button" },
    ],
  },
  {
    title: "Semantics",
    note: "deliberately not the accent hue — each one owns a meaning",
    tokens: [
      {
        name: "--ok",
        means: "Delivered, captured, veg, available",
        tone: "ok",
        example: "Delivered",
      },
      { name: "--ok-soft", means: "Ground behind an ok chip or banner" },
      {
        name: "--warn",
        means: "Preparing, SLA approaching its due time",
        tone: "warn",
        example: "Preparing",
      },
      { name: "--warn-soft", means: "Ground behind a warn chip or callout" },
      {
        name: "--crit",
        means: "Late, breached, cancelled, failed — and the row stripe",
        tone: "crit",
        example: "Late",
      },
      { name: "--crit-soft", means: "Ground behind a crit chip; hover on a danger button" },
      {
        name: "--cool",
        means: "Out for delivery — in motion, not a problem",
        tone: "cool",
        example: "Out for delivery",
      },
      { name: "--cool-soft", means: "Ground behind a cool chip" },
      {
        name: "--mute",
        means: "Pending — nothing has happened yet",
        tone: "mute",
        example: "Pending",
      },
      { name: "--mute-soft", means: "Ground behind a mute chip" },
    ],
  },
];

const SCALE_TOKENS = [
  { name: "--radius", means: "Cards, panels, buttons, the scroll container" },
  { name: "--radius-sm", means: "Swatches, callouts, small ghost buttons" },
  { name: "--radius-pill", means: "Chips and their dots, meter fills" },
  { name: "--shadow", means: "The single elevation this system has" },
] as const;

const COLOUR_NAMES: readonly string[] = GROUPS.flatMap((group) =>
  group.tokens.map((token) => token.name),
);

const ALL_NAMES: readonly string[] = [
  ...COLOUR_NAMES,
  ...SCALE_TOKENS.map((token) => token.name),
];

function SwatchCard({
  swatch,
  value,
}: {
  readonly swatch: Swatch;
  readonly value: string;
}): React.JSX.Element {
  return (
    <div className="tp-sw__card">
      <div
        className="tp-sw__chip"
        style={{ background: `var(${swatch.name})` }}
        aria-hidden="true"
      />
      <div className="tp-sw__body">
        <p className="tp-sw__name">{swatch.name}</p>
        <p className="tp-sw__hex">{value === "" ? "—" : value}</p>
        <p className="tp-sw__means">{swatch.means}</p>
        {swatch.tone !== undefined && swatch.example !== undefined ? (
          <p className="tp-sw__pair">
            <Chip tone={swatch.tone}>{swatch.example}</Chip>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PalettePattern(): React.JSX.Element {
  const ref = React.useRef<HTMLDivElement>(null);
  const values = useTokenValues(ALL_NAMES, ref);

  return (
    <FoundationCanvas
      ref={ref}
      title="Palette"
      subtitle="Every colour token in tokens.css, its live value in the theme you are looking at, and the one thing it is allowed to mean. Flip the toolbar toggle — the hexes below change with it."
    >
      {GROUPS.map((group) => (
        <FoundationGroup key={group.title} title={group.title} note={group.note}>
          <div className="tp-sw">
            {group.tokens.map((token) => (
              <SwatchCard
                key={token.name}
                swatch={token}
                value={values[token.name] ?? ""}
              />
            ))}
          </div>
        </FoundationGroup>
      ))}

      <FoundationGroup
        title="Scale"
        note="the non-colour tokens, for completeness"
      >
        <div className="tp-scale">
          {SCALE_TOKENS.map((token) => (
            <div key={token.name} className="tp-scale__card">
              <div
                className="tp-scale__demo"
                style={{
                  borderRadius:
                    token.name === "--shadow" ? "var(--radius)" : `var(${token.name})`,
                  boxShadow: token.name === "--shadow" ? "var(--shadow)" : undefined,
                }}
                aria-hidden="true"
              />
              <div>
                <p className="tp-sw__name">{token.name}</p>
                <p className="tp-sw__hex tp-sw__hex--raw">
                  {values[token.name] ?? "—"}
                </p>
                <p className="tp-sw__means">{token.means}</p>
              </div>
            </div>
          ))}
        </div>
      </FoundationGroup>

      <div className="tp-note">
        <b>Why the accent is not a semantic.</b> Every food brand reaches for
        saturated orange, which leaves nothing to escalate with. Indigo carries
        structure — links, primary buttons, focus rings — so green, turmeric and
        kashmiri stay free to mean fine, watch this, act now. And every one of
        these tokens is defined on <code>:root</code> first and only then
        redefined for dark, so no colour can exist in one theme and vanish in
        the other.
      </div>
    </FoundationCanvas>
  );
}

const meta: Meta = {
  title: "Foundations/Palette",
  parameters: {
    docs: {
      description: {
        component:
          "The full token set with live values. Values are read from getComputedStyle, so they are the real numbers for the active theme rather than a hex copied into a story.",
      },
    },
  },
};

export default meta;

type Story = StoryObj;

export const Palette: Story = { render: () => <PalettePattern /> };
