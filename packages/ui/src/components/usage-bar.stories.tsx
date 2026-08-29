import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { UsageBar } from "./usage-bar";

const meta = {
  title: "Domain/UsageBar",
  component: UsageBar,
  argTypes: {
    tone: {
      control: { type: "inline-radio" },
      options: ["accent", "ok", "warn", "crit", "cool", "mute"],
    },
  },
} satisfies Meta<typeof UsageBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const stackStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  maxWidth: "420px",
};

const captionStyle: React.CSSProperties = {
  maxWidth: "68ch",
  margin: "16px 0 0",
  fontFamily: "var(--font-ui)",
  fontSize: "13px",
  lineHeight: 1.5,
  color: "var(--ink-3)",
};

/** FOODISHI20 is 96% redeemed — close enough to the cap to warn an operator. */
export const CouponNearingItsCap: Story = {
  args: {
    label: "FOODISHI20 — 20% off, capped at ₹150",
    value: 4812,
    max: 5000,
    valueLabel: "4,812 / 5,000 redeemed",
    tone: "warn",
  },
};

/** SOLDOUT has nothing left to give: 200 of 200, rendered crit. */
export const CouponExhausted: Story = {
  args: {
    label: "SOLDOUT — flat ₹100 off",
    value: 200,
    max: 200,
    valueLabel: "200 / 200 redeemed — exhausted",
    tone: "crit",
  },
};

/**
 * The coupon panel as an operator sees it. The count is always spelled out
 * beside the bar, so a full bar is never the only thing saying "exhausted".
 */
export const CouponPanel: Story = {
  args: {
    label: "FOODISHI20 — 20% off, capped at ₹150",
    value: 4812,
    max: 5000,
  },
  render: () => (
    <div>
      <div style={stackStyle}>
        <UsageBar
          label="FOODISHI20 — 20% off, capped at ₹150"
          value={4812}
          max={5000}
          valueLabel="4,812 / 5,000 redeemed"
          tone="warn"
        />
        <UsageBar
          label="SOLDOUT — flat ₹100 off"
          value={200}
          max={200}
          valueLabel="200 / 200 redeemed — exhausted"
          tone="crit"
        />
        <UsageBar
          label="EXPIRED25 — 25% off, ended 12 Aug"
          value={318}
          max={1000}
          valueLabel="318 / 1,000 redeemed — expired"
          tone="mute"
        />
        <UsageBar
          label="Tandoori Nights — kitchen capacity this hour"
          value={14}
          max={25}
          valueLabel="14 / 25 orders"
          tone="accent"
        />
      </div>
      <p style={captionStyle}>
        Colour never carries meaning alone: every bar prints its own numbers in
        mono tabular figures, and the label says what ran out.
      </p>
    </div>
  ),
};
