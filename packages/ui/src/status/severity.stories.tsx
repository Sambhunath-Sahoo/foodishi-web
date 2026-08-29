import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import {
  formatLate,
  lateTier,
  SEVERITY_LABEL,
  SEVERITY_TEXT,
  type SeverityTier,
} from "./severity";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  SeverityCell,
} from "../components/data-table";
import { PAIR_GLOBALS, ThemePair } from "../stories/theme-pair";

/** One order per tier, plus the boundary cases the thresholds turn on. */
const SAMPLES: readonly { readonly id: string; readonly minutes: number }[] = [
  { id: "ORD-4468", minutes: 0 },
  { id: "ORD-4471", minutes: 43 },
  { id: "ORD-4402", minutes: 91 },
  { id: "ORD-4318", minutes: 392 },
  { id: "ORD-3907", minutes: 671 },
  { id: "ORD-3811", minutes: 697 },
];

function TierRows(): React.JSX.Element {
  return (
    <DataTableScroll>
      <DataTable aria-label="Lateness grading">
        <DataTableHead>
          <DataTableRow>
            <DataTableHeaderCell>Order</DataTableHeaderCell>
            <DataTableHeaderCell numeric>Minutes late</DataTableHeaderCell>
            <DataTableHeaderCell>Rendered</DataTableHeaderCell>
            <DataTableHeaderCell>Reads as</DataTableHeaderCell>
            <DataTableHeaderCell numeric>Tier</DataTableHeaderCell>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {SAMPLES.map((sample) => {
            const tier = lateTier(sample.minutes);
            return (
              <DataTableRow key={sample.id}>
                <SeverityCell tier={tier} mono>
                  {sample.id}
                </SeverityCell>
                <DataTableCell numeric mono>
                  {sample.minutes}
                </DataTableCell>
                <DataTableCell className={SEVERITY_TEXT[tier]}>
                  {formatLate(sample.minutes)}
                </DataTableCell>
                <DataTableCell className="text-ink-3">
                  {SEVERITY_LABEL[tier]}
                </DataTableCell>
                <DataTableCell numeric mono>
                  {tier}
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </DataTableScroll>
  );
}

const meta = {
  title: "Command Deck/Severity",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const note: React.CSSProperties = {
  maxWidth: "76ch",
  margin: "12px 0 0",
  fontFamily: "var(--font-ui)",
  fontSize: "13px",
  lineHeight: 1.5,
  color: "var(--ink-3)",
};

/**
 * All four tiers side by side. `671` used to render exactly like `3`; it now
 * reads `11h 11m`, in the heaviest tone, behind the heaviest stripe.
 */
export const AllTiers: Story = {
  render: () => (
    <div>
      <TierRows />
      <p style={note}>
        Tier 0 draws no stripe — a rule down every row is decoration. Tier 1 is{" "}
        <code>--warn</code>, tier 2 the burnt mix of warn and crit, tier 3{" "}
        <code>--crit</code>. Above 90 minutes the raw count is never shown.
      </p>
    </div>
  ),
};

/** Colour never carries the grade alone: the same rows with hue removed. */
export const WithoutColour: Story = {
  render: () => (
    <div>
      <div style={{ filter: "grayscale(1)" }}>
        <TierRows />
      </div>
      <p style={note}>
        Weight climbs with the tier, so the ordering survives greyscale, a
        colour-blind reader, and the burnt fallback.
      </p>
    </div>
  ),
};

/** What `formatLate` prints, including the boundaries. */
export const Formatting: Story = {
  render: () => {
    const inputs: readonly number[] = [-4, 0, 3, 43, 90, 91, 120, 392, 671, 697, 1440];
    return (
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "6px",
          fontFamily: "var(--font-code)",
          fontSize: "12px",
          color: "var(--ink-2)",
        }}
      >
        {inputs.map((minutes) => {
          const tier: SeverityTier = lateTier(minutes);
          return (
            <li key={minutes}>
              <span style={{ color: "var(--ink-4)" }}>{minutes}</span> →{" "}
              <span className={SEVERITY_TEXT[tier]}>{formatLate(minutes)}</span>{" "}
              <span style={{ color: "var(--ink-4)" }}>(t{tier})</span>
            </li>
          );
        })}
      </ul>
    );
  },
};

/** Both grounds: the burnt tier stays between warn and crit in either. */
export const BothThemes: Story = {
  globals: PAIR_GLOBALS,
  render: () => (
    <ThemePair stacked>
      <TierRows />
    </ThemePair>
  ),
};
