import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PatternCanvas, PatternNote } from "./pattern-canvas";
import { Chip, OrderChip } from "./pattern-bits";
import { formatInr, formatInrCompact, formatInrNegative } from "./money";

/**
 * The cancellation policy is frozen onto the order when it is placed, so the
 * button can state the consequence with the real number instead of a guess.
 * These two shapes are what `GET /orders/{id}/cancellation` returns.
 */
type CancellationPolicy =
  | { readonly kind: "free"; readonly freeMinutesLeft: number }
  | { readonly kind: "fee"; readonly feeAmount: number; readonly reason: string };

interface BillLine {
  readonly id: string;
  readonly label: string;
  readonly note?: string;
  readonly amount: number;
  readonly negative?: boolean;
  readonly chip?: string;
}

const SUBTOTAL = 1370.0;
const PACKAGING = 35.0;
const DELIVERY = 49.0;
const GST = 68.5;
const DISCOUNT = 274.0;
const TOTAL = SUBTOTAL + PACKAGING + DELIVERY + GST - DISCOUNT; /* ₹1,248.50 */

const LINES: readonly BillLine[] = [
  { id: "subtotal", label: "Subtotal", note: "4 items from Tandoori Nights", amount: SUBTOTAL },
  { id: "packaging", label: "Packaging", amount: PACKAGING },
  {
    id: "delivery",
    label: "Delivery",
    note: "4.2 km from Indiranagar",
    amount: DELIVERY,
  },
  { id: "gst", label: "GST", note: "5% on food value", amount: GST },
  {
    id: "discount",
    label: "Discount",
    note: "20% off, capped at ₹300",
    amount: DISCOUNT,
    negative: true,
    chip: "FOODISHI20",
  },
];

function cancelLabel(policy: CancellationPolicy): string {
  return policy.kind === "free"
    ? `Cancel — free for ${policy.freeMinutesLeft} more min`
    : `Cancel — ${formatInrCompact(policy.feeAmount)} fee applies`;
}

function BillRow({ line }: { readonly line: BillLine }): React.JSX.Element {
  return (
    <div className="tp-bill__row">
      <span className="tp-bill__label">
        {line.label}
        {line.chip !== undefined ? (
          <>
            {" "}
            <Chip tone="ok">{line.chip}</Chip>
          </>
        ) : null}
        {line.note !== undefined ? (
          <span className="tp-bill__note">{line.note}</span>
        ) : null}
      </span>
      <span
        className={
          line.negative === true ? "tp-bill__amt tp-tone-ok" : "tp-bill__amt"
        }
      >
        {line.negative === true
          ? formatInrNegative(line.amount)
          : formatInr(line.amount)}
      </span>
    </div>
  );
}

function Bill({
  policy,
  note,
}: {
  readonly policy: CancellationPolicy;
  readonly note: React.ReactNode;
}): React.JSX.Element {
  return (
    <PatternCanvas width={390} device="Customer · phone">
      <div className="tp-stack">
        <div className="tp-panel">
          <div className="tp-panel__head">
            <div>
              <p style={{ fontSize: 15, fontWeight: 600 }}>Tandoori Nights</p>
              <p className="tp-sub">
                <span className="tp-mono">ORD-4471</span> · arriving 14:32
              </p>
            </div>
            <OrderChip status="preparing" />
          </div>

          <div className="tp-panel__body">
            <div className="tp-bill">
              {LINES.map((line) => (
                <BillRow key={line.id} line={line} />
              ))}
              <div className="tp-bill__row tp-bill__total">
                <span className="tp-bill__label">Total paid</span>
                <span className="tp-bill__amt">{formatInr(TOTAL)}</span>
              </div>
            </div>
          </div>

          <div className="tp-panel__foot">
            <button
              type="button"
              className="tp-btn tp-btn--danger tp-btn--block"
              data-size="lg"
            >
              {cancelLabel(policy)}
            </button>
            {policy.kind === "fee" ? (
              <p className="tp-sub" style={{ fontSize: 12 }}>
                {policy.reason}
              </p>
            ) : (
              <p className="tp-sub" style={{ fontSize: 12 }}>
                After that a cancellation fee applies, because the kitchen has
                already started.
              </p>
            )}
          </div>
        </div>

        <PatternNote>{note}</PatternNote>
      </div>
    </PatternCanvas>
  );
}

const CONSEQUENCE_NOTE = (
  <>
    <b>The button states the consequence before the tap.</b> Not a bare
    &ldquo;Cancel&rdquo; followed by a surprise charge — the label carries the
    real number from the cancellation policy frozen onto this order at checkout
    (<code>freeMinutesLeft</code> or <code>feeAmount</code>), so the customer
    decides with the same figure the server will charge. The destructive action
    is outlined, never a filled red block. Every amount is tabular and
    right-aligned, so the column reads as a column.
  </>
);

const meta: Meta = {
  title: "Patterns/Customer — Bill",
  parameters: {
    docs: {
      description: {
        component:
          "The price breakdown at 390px. Subtotal, packaging, delivery with the real distance, GST, the coupon discount and the total — then a cancel button that states its consequence using the number the API returned.",
      },
    },
  },
};

export default meta;

type Story = StoryObj;

export const FreeCancelWindow: Story = {
  name: "Cancel — free for 4 more min",
  parameters: {
    docs: {
      description: {
        story:
          "Inside the free window. The label spends its words on the thing the customer wants to know — how long the door stays open — using freeMinutesLeft from the API, not a hardcoded five.",
      },
    },
  },
  render: () => (
    <Bill
      policy={{ kind: "free", freeMinutesLeft: 4 }}
      note={CONSEQUENCE_NOTE}
    />
  ),
};

export const CancelFeeApplies: Story = {
  name: "Cancel — ₹105 fee applies",
  parameters: {
    docs: {
      description: {
        story:
          "The window has closed. Same button, same place, same outlined treatment — only the number changes, and it is the exact amount the server will charge (feeAmount). The reason line underneath is the server's own wording, shown verbatim.",
      },
    },
  },
  render: () => (
    <Bill
      policy={{
        kind: "fee",
        feeAmount: 105.0,
        reason:
          "Tandoori Nights started cooking at 14:06, so 30% of the food value is charged.",
      }}
      note={
        <>
          {CONSEQUENCE_NOTE}{" "}
          <b>The fee is stated, not hinted.</b> ₹105 is what the API returned
          for this order, and the sentence beneath it is the server&rsquo;s own
          reason string rather than a client-side paraphrase.
        </>
      }
    />
  ),
};
