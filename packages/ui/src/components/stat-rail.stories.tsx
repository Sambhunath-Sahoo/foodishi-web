import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { Stat, StatRail } from "./stat-rail";
import { PAIR_GLOBALS, ThemePair } from "../stories/theme-pair";

/**
 * The real platform numbers: 606 orders today, 125 of them live, 22 refunds
 * past their SLA, 25 restaurants, 150 registered customers. The version this
 * replaces spent five 150px cards and roughly 450px of vertical space saying
 * the same thing, with a paragraph inside each card.
 */
function PlatformRail(): React.JSX.Element {
  return (
    <StatRail ariaLabel="Platform health">
      <Stat
        label="Live orders"
        value={125}
        caption="38 past their promised time"
        spark={[104, 111, 108, 117, 122, 119, 125]}
      />
      <Stat
        label="Breached SLAs"
        value={22}
        caption="oldest 11h 37m past due"
        tone="alarm"
        hint="Refunds that passed their promised settlement window. Each one is a customer waiting on money."
        spark={[9, 11, 12, 16, 18, 20, 22]}
      />
      <Stat label="Orders today" value={606} caption="₹4.21L captured" />
      <Stat label="Restaurants" value={25} caption="23 accepting orders" />
      <Stat label="Customers" value={150} caption="18 joined this week" />
    </StatRail>
  );
}

const meta = {
  title: "Command Deck/StatRail",
  component: StatRail,
  args: { ariaLabel: "Platform health" },
} satisfies Meta<typeof StatRail>;

export default meta;
type Story = StoryObj<typeof meta>;

const note: React.CSSProperties = {
  maxWidth: "72ch",
  margin: "12px 0 0",
  fontFamily: "var(--font-ui)",
  fontSize: "13px",
  lineHeight: 1.5,
  color: "var(--ink-3)",
};

/** One 60px band, cells divided by a 1px rule, one alarm cell. */
export const PlatformHealth: Story = {
  render: () => (
    <div>
      <PlatformRail />
      <p style={note}>
        60px tall. A 10px tracked label, a 22px tabular number, one line of
        caption — the paragraph that used to sit inside the card is now the
        tooltip on &ldquo;Breached SLAs&rdquo;. Only that cell takes the alarm
        ground, so 22 reads louder than 25.
      </p>
    </div>
  ),
};

/** Why the standard caps alarms at one or two cells. */
export const AlarmDiscipline: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div>
        <StatRail ariaLabel="Everything is loud">
          <Stat label="Live orders" value={125} caption="38 past promised" tone="alarm" />
          <Stat label="Breached SLAs" value={22} caption="oldest 11h 37m" tone="alarm" />
          <Stat label="Orders today" value={606} caption="₹4.21L captured" tone="alarm" />
          <Stat label="Restaurants" value={25} caption="23 accepting" tone="alarm" />
          <Stat label="Customers" value={150} caption="18 this week" tone="alarm" />
        </StatRail>
        <p style={note}>Five alarms. Nothing to act on first.</p>
      </div>
      <div>
        <PlatformRail />
        <p style={note}>One alarm. The eye lands on 22 before it reads a word.</p>
      </div>
    </div>
  ),
};

/** Every tone the rail knows, so a screen picks deliberately. */
export const Tones: Story = {
  render: () => (
    <StatRail ariaLabel="Tones">
      <Stat label="Default" value={606} caption="the ordinary case" />
      <Stat label="Ok" value="99.2%" caption="payments captured" tone="ok" />
      <Stat label="Warn" value={38} caption="approaching their SLA" tone="warn" />
      <Stat label="Alarm" value={22} caption="past their SLA" tone="alarm" />
    </StatRail>
  ),
};

/** A 390px phone. The rail scrolls inside its own border; the page does not. */
export const NarrowViewportScrolls: Story = {
  render: () => (
    <div style={{ maxWidth: "390px" }}>
      <PlatformRail />
      <p style={note}>
        390px frame. Cells hold their 136px minimum and the rail scrolls
        sideways rather than reflowing into a second row of cards.
      </p>
    </div>
  ),
};

/** Both grounds. The alarm cell reads as an alarm in either. */
export const BothThemes: Story = {
  globals: PAIR_GLOBALS,
  render: () => (
    <ThemePair stacked>
      <PlatformRail />
    </ThemePair>
  ),
};
