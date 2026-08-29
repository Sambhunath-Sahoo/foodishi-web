import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { FilterChip, Freshness, Kbd, KbdHint, LiveDot, Toolbar } from "./toolbar";
import { SegmentedControl } from "./segmented-control";
import { PAIR_GLOBALS, ThemePair } from "../stories/theme-pair";

type Axis = "all" | "late" | "breached";

const AXIS_OPTIONS = [
  { value: "all", label: "All live", count: 125 },
  { value: "late", label: "Late", count: 38 },
  { value: "breached", label: "Breached SLA", count: 22 },
] as const satisfies readonly { value: Axis; label: string; count: number }[];

/** The operator board's toolbar, wired to state so the chips really dismiss. */
function BoardToolbar(): React.JSX.Element {
  const [axis, setAxis] = React.useState<Axis>("late");
  const [kitchen, setKitchen] = React.useState<string | null>("Tandoori Nights");
  const [placedWindow, setPlacedWindow] = React.useState<string | null>("Today");
  const [at] = React.useState(() => Date.now());

  return (
    <Toolbar
      ariaLabel="Live board filters"
      right={
        <>
          <KbdHint label="Focus search" keys={["/"]} />
          <KbdHint label="Next row" keys={["J"]} />
          <LiveDot interval={15} at={at} />
        </>
      }
    >
      <SegmentedControl
        options={AXIS_OPTIONS}
        value={axis}
        onValueChange={setAxis}
        ariaLabel="Which live orders"
      />
      {kitchen !== null ? (
        <FilterChip
          label="Kitchen"
          value={kitchen}
          onDismiss={() => setKitchen(null)}
        />
      ) : null}
      {placedWindow !== null ? (
        <FilterChip
          label="Placed"
          value={placedWindow}
          onDismiss={() => setPlacedWindow(null)}
        />
      ) : null}
      <FilterChip
        label="Your kitchens only"
        tone="accent"
        title="You see the orders for the restaurants you own or manage."
      />
    </Toolbar>
  );
}

const meta = {
  title: "Command Deck/Toolbar",
  component: Toolbar,
  args: { ariaLabel: "Live board filters" },
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

const note: React.CSSProperties = {
  maxWidth: "76ch",
  margin: "14px 0 0",
  fontFamily: "var(--font-ui)",
  fontSize: "13px",
  lineHeight: 1.5,
  color: "var(--ink-3)",
};

/** Filters, not chrome: no panel, no heading, one line. */
export const LiveBoardFilters: Story = {
  render: () => (
    <div>
      <BoardToolbar />
      <p style={note}>
        Segmented control for the primary axis, dismissible chips for everything
        else, keyboard hints where a shortcut exists, and a live indicator that
        states its own interval. The scope chip reads &ldquo;Your kitchens
        only&rdquo; — not a sentence about how scoping is enforced.
      </p>
    </div>
  ),
};

/** Chips: dismissible for a filter, plain for a standing fact. */
export const Chips: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      <FilterChip label="Kitchen" value="Tandoori Nights" onDismiss={() => {}} />
      <FilterChip label="Status" value="Preparing" tone="warn" onDismiss={() => {}} />
      <FilterChip label="Past promised" value="over 6h" tone="crit" onDismiss={() => {}} />
      <FilterChip label="Your kitchens only" tone="accent" />
      <FilterChip label="Settled refunds hidden" />
    </div>
  ),
};

/** Key caps, alone and as a hint. */
export const KeyboardHints: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
      <KbdHint label="Focus search" keys={["/"]} />
      <KbdHint label="Command palette" keys={["⌘", "K"]} />
      <KbdHint label="Refund selected" keys={["⇧", "R"]} />
      <span style={{ fontFamily: "var(--font-ui)", fontSize: "13px", color: "var(--ink-3)" }}>
        Press <Kbd>Esc</Kbd> to clear
      </span>
    </div>
  ),
};

function FreshnessRow(): React.JSX.Element {
  const [at] = React.useState(() => Date.now() - 42_000);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <LiveDot interval={15} at={at} />
      <LiveDot interval={30} at={Date.now()} label="Streaming" />
      <LiveDot interval={15} at={at} paused />
      <span style={{ fontFamily: "var(--font-ui)", fontSize: "11px", color: "var(--ink-3)" }}>
        In a footer: <Freshness at={at} />
      </span>
    </div>
  );
}

/** The live indicator, its interval, and the age of what is on screen. */
export const Liveness: Story = {
  render: () => <FreshnessRow />,
};

/** Both grounds. */
export const BothThemes: Story = {
  globals: PAIR_GLOBALS,
  render: () => (
    <ThemePair stacked>
      <BoardToolbar />
    </ThemePair>
  ),
};
