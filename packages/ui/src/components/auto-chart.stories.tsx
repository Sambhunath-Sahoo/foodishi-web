import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { AutoScaleChart, type AutoChartPoint } from "./auto-chart";
import { PAIR_GLOBALS, ThemePair } from "../stories/theme-pair";

/** Refunds that breached their SLA, per day, for a fortnight. Peak is 9. */
const BREACHES: readonly AutoChartPoint[] = [
  { label: "6 Aug", value: 1 },
  { label: "7 Aug", value: 0 },
  { label: "8 Aug", value: 2 },
  { label: "9 Aug", value: 1 },
  { label: "10 Aug", value: 4 },
  { label: "11 Aug", value: 3 },
  { label: "12 Aug", value: 9 },
  { label: "13 Aug", value: 5 },
  { label: "14 Aug", value: 2 },
  { label: "15 Aug", value: 1 },
  { label: "16 Aug", value: 3 },
  { label: "17 Aug", value: 6 },
  { label: "18 Aug", value: 4 },
  { label: "19 Aug", value: 2 },
];

const REVENUE: readonly AutoChartPoint[] = [
  { label: "6 Aug", value: 38200 },
  { label: "7 Aug", value: 41100 },
  { label: "8 Aug", value: 36400 },
  { label: "9 Aug", value: 52800 },
  { label: "10 Aug", value: 61200 },
  { label: "11 Aug", value: 47900 },
  { label: "12 Aug", value: 44300 },
  { label: "13 Aug", value: 58100 },
];

const ALL_ZERO: readonly AutoChartPoint[] = BREACHES.map((point) => ({
  label: point.label,
  value: 0,
}));

const meta = {
  title: "Command Deck/AutoScaleChart",
  component: AutoScaleChart,
  args: {
    points: BREACHES,
    ariaLabel: "Refunds that breached their SLA, per day",
  },
} satisfies Meta<typeof AutoScaleChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const frame: React.CSSProperties = {
  maxWidth: "560px",
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  padding: "14px 16px 12px",
};

const note: React.CSSProperties = {
  maxWidth: "76ch",
  margin: "12px 0 0",
  fontFamily: "var(--font-ui)",
  fontSize: "13px",
  lineHeight: 1.5,
  color: "var(--ink-3)",
};

/**
 * The chart that started this: a y-axis pinned at 200 while every daily value
 * sat under 10. Here the axis stops at 10 because the series peaks at 9, and
 * the peak says so in words.
 */
export const BreachesPerDay: Story = {
  render: () => (
    <div>
      <div style={frame}>
        <AutoScaleChart
          points={BREACHES}
          ariaLabel="Refunds that breached their SLA, per day"
          tone="crit"
          caption="Refunds past their promised settlement window, per day."
        />
      </div>
      <p style={note}>
        The axis top is derived from the series on every render — there is no
        constant in the component to get wrong.
      </p>
    </div>
  ),
};

/** Same component, a series three orders of magnitude larger. */
export const RevenuePerDay: Story = {
  render: () => (
    <div style={frame}>
      <AutoScaleChart
        points={REVENUE}
        ariaLabel="Gross merchandise value, per day"
        tone="accent"
        height={140}
        formatValue={(value) => `₹${Math.round(value / 1000)}k`}
        caption="Captured payments per day, this fortnight."
      />
    </div>
  ),
};

/** Every value is zero: a sentence, not a flat line pretending to be data. */
export const EverythingZero: Story = {
  render: () => (
    <div>
      <div style={frame}>
        <AutoScaleChart
          points={ALL_ZERO}
          ariaLabel="Refunds that breached their SLA, per day"
          tone="ok"
          emptyCaption="No refund breached its SLA in these 14 days."
          caption="Refunds past their promised settlement window, per day."
        />
      </div>
      <p style={note}>
        A flat line along the floor is indistinguishable from a broken query.
        The caption says which one it is.
      </p>
    </div>
  ),
};

/** One point is not a trend. */
export const NotEnoughHistory: Story = {
  render: () => (
    <div style={frame}>
      <AutoScaleChart
        points={[{ label: "19 Aug", value: 4 }]}
        ariaLabel="Refunds that breached their SLA, per day"
        tone="crit"
        caption="Refunds past their promised settlement window, per day."
      />
    </div>
  ),
};

/** Both grounds. */
export const BothThemes: Story = {
  globals: PAIR_GLOBALS,
  render: () => (
    <ThemePair>
      <div style={{ ...frame, maxWidth: "none" }}>
        <AutoScaleChart
          points={BREACHES}
          ariaLabel="Refunds that breached their SLA, per day"
          tone="crit"
          caption="Refunds past their promised settlement window, per day."
        />
      </div>
    </ThemePair>
  ),
};
