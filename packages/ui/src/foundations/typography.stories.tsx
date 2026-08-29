import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FoundationCanvas, FoundationGroup } from "./foundation-canvas";
import { formatInr } from "../patterns/money";

interface Specimen {
  readonly id: string;
  readonly role: string;
  readonly spec: string;
  readonly sample: React.ReactNode;
  readonly style: React.CSSProperties;
}

const TITLE_FACE: React.CSSProperties = { fontFamily: "var(--font-display)" };
const UI_FACE: React.CSSProperties = { fontFamily: "var(--font-ui)" };
const MONO_FACE: React.CSSProperties = {
  fontFamily: "var(--font-code)",
  fontVariantNumeric: "tabular-nums",
};

const DISPLAY: readonly Specimen[] = [
  {
    id: "page-title",
    role: "Page title",
    spec: "--font-display · 30/33 · 400",
    sample: "Live board",
    style: { ...TITLE_FACE, fontSize: 30, lineHeight: 1.12, fontWeight: 400 },
  },
  {
    id: "page-title-sm",
    role: "Page title, phone",
    spec: "--font-display · 24/27 · 400",
    sample: "Your order",
    style: { ...TITLE_FACE, fontSize: 24, lineHeight: 1.12, fontWeight: 400 },
  },
];

const UI: readonly Specimen[] = [
  {
    id: "partner-item",
    role: "Partner item",
    spec: "--font-ui · 17/22 · 500 · tablet",
    sample: "Mutton Dum Biryani",
    style: { ...UI_FACE, fontSize: 17, fontWeight: 500 },
  },
  {
    id: "partner-button",
    role: "Partner button",
    spec: "--font-ui · 17 · 600 · 56px target",
    sample: "Accept — 22 min prep",
    style: { ...UI_FACE, fontSize: 17, fontWeight: 600 },
  },
  {
    id: "bill-total",
    role: "Bill total",
    spec: "--font-ui · 18 · 700 · tabular",
    sample: formatInr(1248.5),
    style: {
      ...UI_FACE,
      fontSize: 18,
      fontWeight: 700,
      fontVariantNumeric: "tabular-nums",
    },
  },
  {
    id: "card-title",
    role: "Card title",
    spec: "--font-ui · 15 · 600",
    sample: "Tandoori Nights",
    style: { ...UI_FACE, fontSize: 15, fontWeight: 600 },
  },
  {
    id: "body",
    role: "Body / bill row",
    spec: "--font-ui · 14/20 · 400",
    sample: "Delivery — 4.2 km from Indiranagar",
    style: { ...UI_FACE, fontSize: 14 },
  },
  {
    id: "table",
    role: "Operator table cell",
    spec: "--font-ui · 13 · 400 · dense",
    sample: "Hyderabadi Dum · Anitha K. · 4 items",
    style: { ...UI_FACE, fontSize: 13 },
  },
  {
    id: "chip",
    role: "Chip",
    spec: "--font-ui · 12 · 500",
    sample: "Out for delivery",
    style: { ...UI_FACE, fontSize: 12, fontWeight: 500 },
  },
  {
    id: "caption",
    role: "Caption",
    spec: "--font-ui · 12 · 400 · --ink-3",
    sample: "Koramangala hub · last 60 minutes",
    style: { ...UI_FACE, fontSize: 12, color: "var(--ink-3)" },
  },
  {
    id: "column-label",
    role: "Column label",
    spec: "--font-ui · 10 · 700 · .09em · caps",
    sample: "SLA BREACHED",
    style: {
      ...UI_FACE,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.09em",
      textTransform: "uppercase",
      color: "var(--ink-3)",
    },
  },
];

const MONO: readonly Specimen[] = [
  {
    id: "order-id",
    role: "Order id",
    spec: "--font-code · 12 · 600",
    sample: "ORD-4471",
    style: { ...MONO_FACE, fontSize: 12, fontWeight: 600 },
  },
  {
    id: "timestamp",
    role: "Timestamp",
    spec: "--font-code · 11 · 400 · --ink-3",
    sample: "2026-08-20 14:32:07 +05:30",
    style: { ...MONO_FACE, fontSize: 11, color: "var(--ink-3)" },
  },
  {
    id: "sla",
    role: "SLA countdown",
    spec: "--font-code · 13 · 400 · --crit",
    sample: "15:02 over",
    style: { ...MONO_FACE, fontSize: 13, color: "var(--crit)" },
  },
  {
    id: "provider-ref",
    role: "Provider ref",
    spec: "--font-code · 12 · 400",
    sample: "pay_3Kq8Xm2Rb7Tzk · rfnd_9Pd2Ls",
    style: { ...MONO_FACE, fontSize: 12 },
  },
  {
    id: "coupon",
    role: "Coupon code",
    spec: "--font-code · 12 · 600",
    sample: "FOODISHI20 · SOLDOUT · EXPIRED25",
    style: { ...MONO_FACE, fontSize: 12, fontWeight: 600 },
  },
];

const FIGURE_ROWS = [
  { id: "ORD-4465", amount: 2140.0 },
  { id: "ORD-4471", amount: 1248.5 },
  { id: "ORD-4468", amount: 486.0 },
  { id: "ORD-4455", amount: 372.0 },
  { id: "ORD-4473", amount: 1795.0 },
] as const;

function SpecimenRows({
  rows,
}: {
  readonly rows: readonly Specimen[];
}): React.JSX.Element {
  return (
    <div className="tp-ty">
      {rows.map((row) => (
        <div key={row.id} className="tp-ty__row">
          <div className="tp-ty__meta">
            <span className="tp-ty__role">{row.role}</span>
            <span className="tp-ty__spec">{row.spec}</span>
          </div>
          <div className="tp-ty__sample" style={row.style}>
            {row.sample}
          </div>
        </div>
      ))}
    </div>
  );
}

function TypographyPattern(): React.JSX.Element {
  return (
    <FoundationCanvas
      title="Typography"
      subtitle="One superfamily, three jobs. IBM Plex Serif announces a page and appears nowhere else; IBM Plex Sans carries the interface; IBM Plex Mono is reserved for the strings a human reads back to support, and for money."
    >
      <FoundationGroup
        title="IBM Plex Serif — page titles only"
        note="never inside a table, never on a button"
      >
        <p className="tp-ty__alphabet" style={TITLE_FACE}>
          Live board · Today · Refunds · Your order
        </p>
        <SpecimenRows rows={DISPLAY} />
      </FoundationGroup>

      <FoundationGroup
        title="IBM Plex Sans — everything else"
        note="one face across three densities: 13px operator, 17px partner, 14px customer"
      >
        <p className="tp-ty__alphabet" style={UI_FACE}>
          ABCDEFGHIJKLM abcdefghijklm 0123456789 ₹ · —
        </p>
        <SpecimenRows rows={UI} />
      </FoundationGroup>

      <FoundationGroup
        title="IBM Plex Mono — ids, timestamps, provider refs"
        note="anything a customer reads aloud to support, or an operator pastes into a search box"
      >
        <p className="tp-ty__alphabet" style={MONO_FACE}>
          ORD-4471 · 14:32:07 · pay_3Kq8Xm2Rb7Tzk
        </p>
        <SpecimenRows rows={MONO} />
      </FoundationGroup>

      <FoundationGroup
        title="Tabular figures"
        note="money and any column of digits, right-aligned"
      >
        <div className="tp-panel">
          <div className="tp-panel__body">
            <table className="tp-fig">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col" style={{ textAlign: "right" }}>
                    tabular-nums · right
                  </th>
                  <th scope="col" style={{ textAlign: "right" }}>
                    proportional (wrong)
                  </th>
                </tr>
              </thead>
              <tbody>
                {FIGURE_ROWS.map((row) => (
                  <tr key={row.id}>
                    <td className="tp-mono">{row.id}</td>
                    <td className="tp-fig__on">{formatInr(row.amount)}</td>
                    <td className="tp-fig__off">{formatInr(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="tp-note">
          <b>The right-hand column is the bug.</b> Proportional digits make a
          column of money ragged, so an operator scanning thirty-eight rows for
          the large one has to read instead of glance. Every money cell in this
          system sets <code>font-variant-numeric: tabular-nums</code> and
          right-aligns — that is what the <code>.tabular</code> class in
          tokens.css exists for.
        </div>
      </FoundationGroup>
    </FoundationCanvas>
  );
}

const meta: Meta = {
  title: "Foundations/Typography",
  parameters: {
    docs: {
      description: {
        component:
          "The type scale with all three faces labelled by role, plus the tabular-figures rule shown against its own counter-example.",
      },
    },
  },
};

export default meta;

type Story = StoryObj;

export const Typography: Story = { render: () => <TypographyPattern /> };
