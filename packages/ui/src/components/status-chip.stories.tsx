import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { StatusChip } from "./status-chip";
import { ORDER_STATUSES, type OrderStatusOrLate } from "../status/order-status";

/**
 * Every status the operator board can paint. "late" is not stored by the API —
 * it is derived from the SLA — but it shares the chip, so it lives here too.
 */
const ALL_STATUSES: readonly OrderStatusOrLate[] = [...ORDER_STATUSES, "late"];

const DOT_NOTE =
  "Colour never carries meaning alone: every chip carries a dot, and the label " +
  "spells the state out. The board reads correctly without colour vision, and " +
  "on a kitchen tablet washed out by daylight.";

const meta = {
  title: "Domain/StatusChip",
  component: StatusChip,
  parameters: {
    docs: { description: { component: DOT_NOTE } },
  },
  argTypes: {
    status: {
      control: { type: "select" },
      options: [...ALL_STATUSES, "refund_pending"],
      description:
        "One of the seven OrderStatus values, the derived \"late\", or an " +
        "unknown string from a newer API.",
    },
    label: { control: { type: "text" } },
  },
} satisfies Meta<typeof StatusChip>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------- layout helpers, token-driven, no literal colour ---------- */

const paneStyle: React.CSSProperties = {
  flex: "1 1 320px",
  minWidth: "280px",
  background: "var(--bg)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  padding: "16px",
};

const paneTitleStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontFamily: "var(--font-ui)",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
};

const chipRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const noteStyle: React.CSSProperties = {
  maxWidth: "68ch",
  margin: "16px 0 0",
  fontFamily: "var(--font-ui)",
  fontSize: "13px",
  lineHeight: 1.5,
  color: "var(--ink-3)",
};

function ChipPane({
  title,
  theme,
}: {
  readonly title: string;
  readonly theme?: "dark";
}): React.JSX.Element {
  return (
    <section style={paneStyle} data-theme={theme}>
      <h3 style={paneTitleStyle}>{title}</h3>
      <div style={chipRowStyle}>
        {ALL_STATUSES.map((status) => (
          <StatusChip key={status} status={status} />
        ))}
      </div>
    </section>
  );
}

/* ---------- stories ---------- */

export const Preparing: Story = {
  args: { status: "preparing" },
};

/**
 * All seven OrderStatus values plus the derived "late", light beside dark.
 * The right pane pins `data-theme="dark"`, so both themes are visible in one
 * frame regardless of the toolbar; the story itself pins the toolbar to light
 * so the left pane stays light.
 */
export const AllStatuses: Story = {
  args: { status: "pending" },
  globals: { theme: "light" },
  parameters: {
    docs: { description: { story: DOT_NOTE } },
  },
  render: () => (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
        <ChipPane title="Light" />
        <ChipPane title="Dark" theme="dark" />
      </div>
      <p style={noteStyle}>{DOT_NOTE}</p>
    </div>
  ),
};

/** A status the client has not been taught yet degrades, it does not throw. */
export const UnknownStatusFromANewerApi: Story = {
  args: { status: "refund_pending" },
  parameters: {
    docs: {
      description: {
        story:
          "The API grew a status this build has never seen. The chip renders a " +
          "muted \"Unknown\" rather than failing inside a table row.",
      },
    },
  },
};

/** The tone still comes from the status; only the words change. */
export const OverriddenLabel: Story = {
  args: { status: "late", label: "Late · 11 min over" },
};
