import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PatternCanvas, PatternNote } from "./pattern-canvas";
import { Chip, Money, OrderChip } from "./pattern-bits";
import { formatInr } from "./money";

interface Line {
  readonly id: string;
  readonly qty: number;
  readonly name: string;
  readonly options?: string;
  readonly amount: number;
}

const LINES: readonly Line[] = [
  {
    id: "L1",
    qty: 2,
    name: "Mutton Dum Biryani",
    options: "Family pack · extra raita",
    amount: 1098.0,
  },
  { id: "L2", qty: 1, name: "Mirchi Ka Salan", amount: 152.0 },
  { id: "L3", qty: 1, name: "Masala Dosa", options: "No onion", amount: 120.0 },
];

const SUBTOTAL = 1370.0;

function OrderLines(): React.JSX.Element {
  return (
    <ul className="tp-items">
      {LINES.map((line) => (
        <li key={line.id} className="tp-item">
          <span className="tp-item__qty">{line.qty}×</span>
          <span>
            <span className="tp-item__name">{line.name}</span>
            {line.options !== undefined ? (
              <span className="tp-item__opt">{line.options}</span>
            ) : null}
          </span>
          <span className="tp-item__amt">{formatInr(line.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

function AcceptCard(): React.JSX.Element {
  return (
    <PatternCanvas width={720} device="Partner · tablet · one decision">
      <div className="tp-stack">
        <div className="tp-panel" data-stripe="warn">
          <div className="tp-panel__head">
            <div>
              <p className="tp-mono" style={{ fontSize: 15, fontWeight: 600 }}>
                ORD-4471
              </p>
              <p className="tp-sub" style={{ fontSize: 14 }}>
                Tandoori Nights · Indiranagar · placed{" "}
                <span className="tp-mono">14:02</span>
              </p>
            </div>
            <div className="tp-row-flex" style={{ justifyContent: "flex-end" }}>
              <Chip tone="accent" large>
                New order
              </Chip>
              <Chip tone="warn" large>
                Respond in 2:41
              </Chip>
            </div>
          </div>

          <div className="tp-panel__body">
            <div className="tp-stack">
              <OrderLines />
              <hr className="tp-hr" />
              <div className="tp-spread" style={{ fontSize: 16 }}>
                <span className="tp-muted">Subtotal · 4 items</span>
                <span style={{ fontWeight: 600 }}>
                  <Money amount={SUBTOTAL} />
                </span>
              </div>
              <div className="tp-callout" data-tone="warn">
                <span className="tp-callout__dot" aria-hidden="true" />
                <span>
                  <b>Allergy note from Priya R.</b> No onion in the dosa — she
                  will refuse the whole order if it arrives with onion.
                </span>
              </div>
            </div>
          </div>

          <div className="tp-panel__foot">
            <button
              type="button"
              className="tp-btn tp-btn--primary tp-btn--block"
              data-size="lg"
            >
              Accept — 22 min prep
            </button>
            <div className="tp-row-flex" style={{ gap: 10 }}>
              <button
                type="button"
                className="tp-btn tp-btn--outline tp-grow"
                data-size="lg"
              >
                Change prep time
              </button>
              <button
                type="button"
                className="tp-btn tp-btn--danger tp-grow"
                data-size="lg"
              >
                Reject — tell Priya why
              </button>
            </div>
          </div>
        </div>

        <PatternNote>
          <b>One decision per card.</b> Accept is the only filled button and it
          spans the full width at 56px tall — a thumb finds it without looking,
          which is the whole point on a counter with wet hands. Reject sits
          beside a neutral option and is <i>outlined</i>, never a red block
          (DESIGN.md #5). Both secondary actions stay 56px too: touch target is
          a density decision, not an importance one.
        </PatternNote>
      </div>
    </PatternCanvas>
  );
}

function ReadyCard(): React.JSX.Element {
  return (
    <PatternCanvas width={720} device="Partner · tablet · in the kitchen">
      <div className="tp-stack">
        <div className="tp-panel">
          <div className="tp-panel__head">
            <div>
              <p className="tp-mono" style={{ fontSize: 15, fontWeight: 600 }}>
                ORD-4468
              </p>
              <p className="tp-sub" style={{ fontSize: 14 }}>
                Idli Factory · Jayanagar · accepted{" "}
                <span className="tp-mono">14:11</span>
              </p>
            </div>
            <div className="tp-row-flex" style={{ justifyContent: "flex-end" }}>
              <OrderChip status="preparing" large />
              <Chip tone="cool" large>
                Vinod S. arriving 14:37
              </Chip>
            </div>
          </div>

          <div className="tp-panel__body">
            <div className="tp-stack">
              <ul className="tp-items">
                <li className="tp-item">
                  <span className="tp-item__qty">2×</span>
                  <span className="tp-item__name">Masala Dosa</span>
                  <span className="tp-item__amt">{formatInr(240.0)}</span>
                </li>
                <li className="tp-item">
                  <span className="tp-item__qty">1×</span>
                  <span className="tp-item__name">Paneer Tikka</span>
                  <span className="tp-item__amt">{formatInr(246.0)}</span>
                </li>
              </ul>
              <hr className="tp-hr" />
              <div className="tp-spread" style={{ fontSize: 16 }}>
                <span className="tp-muted">Due to rider</span>
                <span className="tp-mono" style={{ fontWeight: 600 }}>
                  14:37 · 2:44 left
                </span>
              </div>
            </div>
          </div>

          <div className="tp-panel__foot">
            <button
              type="button"
              className="tp-btn tp-btn--primary tp-btn--block"
              data-size="lg"
            >
              Mark ready for pickup
            </button>
            <button
              type="button"
              className="tp-btn tp-btn--outline tp-btn--block"
              data-size="lg"
            >
              Need 5 more minutes
            </button>
          </div>
        </div>

        <PatternNote>
          <b>The card changes its one decision as the order moves.</b> Accept
          becomes &ldquo;Mark ready for pickup&rdquo;; the escape hatch becomes
          &ldquo;Need 5 more minutes&rdquo;, which is honest about what it costs
          the rider. No card ever shows two filled buttons.
        </PatternNote>
      </div>
    </PatternCanvas>
  );
}

const meta: Meta = {
  title: "Patterns/Partner — Order card",
  parameters: {
    docs: {
      description: {
        component:
          "Read at two feet on a tablet with busy hands: one decision per card, 17px type, a single full-width 56px primary action, and an outlined destructive.",
      },
    },
  },
};

export default meta;

type Story = StoryObj;

export const AcceptDecision: Story = { render: () => <AcceptCard /> };

export const ReadyForPickup: Story = { render: () => <ReadyCard /> };
