import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { Badge } from "./badge";
import { Button } from "./button";
import {
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { StatusChip } from "./status-chip";
import type { Tone } from "../status/tone";
import type * as React from "react";

const meta = {
  title: "Primitives/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Reach for **Card** when a record needs a boundary of its own — one order the",
          "kitchen must decide on, one payout, one settings group. On the operator board a",
          "list of records is a `Table`; a card costs far more vertical space and earns it",
          "only when the thing inside is a *decision* rather than a *row*.",
          "",
          "The partner app is the clearest case: one order per card, the whole card readable",
          "at two feet, one full-width button at the bottom.",
          "",
          "`stripe` paints a 3px severity bar down the leading edge. That bar exists because",
          "**colour never carries meaning alone** (DESIGN.md #3) — the stripe is a second,",
          "positional signal that survives a colour-blind operator and a sun-washed tablet.",
          "Reserve it for cards that genuinely differ in urgency; a board where every card is",
          "striped has said nothing.",
          "",
          "`Card` is a plain container: it has no disabled state and takes no focus. Focus and",
          "disabled live on the controls inside it.",
        ].join("\n"),
      },
    },
  },
  argTypes: {
    stripe: {
      control: "inline-radio",
      options: [undefined, "accent", "ok", "warn", "crit", "cool", "mute"],
    },
  },
  args: {},
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

const TONES: readonly Tone[] = ["accent", "ok", "warn", "crit", "cool", "mute"];

const STRIPE_MEANING: Record<Tone, string> = {
  accent: "Selected — the card the operator is acting on",
  ok: "Delivered — captured ₹1,248.50",
  warn: "Preparing — SLA due in 4 min",
  crit: "Late — SLA breached 6 min ago",
  cool: "Out for delivery — rider 1.2 km away",
  mute: "Pending — waiting on the kitchen",
};

function OrderCard({ stripe }: { readonly stripe?: Tone }): React.JSX.Element {
  return (
    <Card stripe={stripe} className="w-full max-w-md">
      <CardHeader>
        <div className="flex flex-col gap-0.5">
          <CardTitle>Hyderabadi Dum</CardTitle>
          <CardDescription>
            <span className="font-mono tabular-nums">ORD-4471</span> · 3 items
          </CardDescription>
        </div>
        <Badge tone={stripe ?? "mute"}>
          {stripe === undefined ? "Pending" : STRIPE_MEANING[stripe].split(" — ")[0]}
        </Badge>
      </CardHeader>
      <CardBody>
        <ul className="flex flex-col gap-1 font-sans text-[13px] text-ink-2">
          <li className="flex justify-between gap-4">
            <span>2 × Mutton Dum Biryani</span>
            <span className="font-mono tabular-nums">₹898.00</span>
          </li>
          <li className="flex justify-between gap-4">
            <span>1 × Mirchi Ka Salan</span>
            <span className="font-mono tabular-nums">₹180.00</span>
          </li>
          <li className="flex justify-between gap-4">
            <span>1 × Paneer Tikka</span>
            <span className="font-mono tabular-nums">₹170.50</span>
          </li>
        </ul>
      </CardBody>
      <CardFooter>
        <span className="mr-auto font-sans text-[13px] text-ink-3">Total</span>
        <span className="font-mono text-sm tabular-nums text-ink">₹1,248.50</span>
      </CardFooter>
    </Card>
  );
}

export const Default: Story = {
  render: () => <OrderCard />,
};

export const Composition: Story = {
  name: "Header, body, footer",
  parameters: {
    docs: {
      description: {
        story:
          "`CardHeader` is a two-column flex row, so a title on the left and a status chip on the right need no extra layout. `CardFooter` right-aligns its children — put the primary action last so it lands nearest the thumb.",
      },
    },
  },
  render: () => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex flex-col gap-0.5">
          <CardTitle>Refund request</CardTitle>
          <CardDescription>
            <span className="font-mono tabular-nums">ORD-4471</span> · Tandoori Nights
          </CardDescription>
        </div>
        <Badge tone="warn">Awaiting review</Badge>
      </CardHeader>
      <CardBody>
        <p className="font-sans text-sm text-ink-2">
          Customer reports the Mirchi Ka Salan never arrived. Rider marked the order
          delivered at 20:14. Captured amount is{" "}
          <span className="font-mono tabular-nums">₹1,248.50</span>.
        </p>
      </CardBody>
      <CardFooter>
        <Button variant="ghost">Ask the rider</Button>
        <Button variant="danger">Refund ₹180.00</Button>
      </CardFooter>
    </Card>
  ),
};

export const NoStripe: Story = {
  name: "Plain — no stripe",
  parameters: {
    docs: {
      description: {
        story:
          "The default. Most cards are not urgent, and a board where everything is striped has spent the signal.",
      },
    },
  },
  render: () => <OrderCard />,
};

export const EveryStripe: Story = {
  name: "Every stripe tone",
  parameters: {
    docs: {
      description: {
        story:
          "One card per tone, each labelled with the state it stands for. The stripe is positional as well as coloured — you can tell the cards apart in greyscale by reading the label, and at a glance by where the eye has learned the bar sits.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-3">
      {TONES.map((tone) => (
        <Card key={tone} stripe={tone} className="w-full max-w-md">
          <CardHeader>
            <div className="flex flex-col gap-0.5">
              <CardTitle>{STRIPE_MEANING[tone].split(" — ")[0]}</CardTitle>
              <CardDescription>{STRIPE_MEANING[tone].split(" — ")[1]}</CardDescription>
            </div>
            <Badge tone={tone}>{tone}</Badge>
          </CardHeader>
        </Card>
      ))}
    </div>
  ),
};

export const PartnerDensity: Story = {
  name: "Partner density — one decision per card",
  parameters: {
    docs: {
      description: {
        story:
          "Two feet away, hands busy, one full-width `lg` button. The `crit` stripe is doing real work here: this is the card that is already late.",
      },
    },
  },
  render: () => (
    <Card stripe="crit" className="w-full max-w-sm">
      <CardHeader>
        <div className="flex flex-col gap-0.5">
          <CardTitle>2 × Mutton Dum Biryani</CardTitle>
          <CardDescription>
            <span className="font-mono tabular-nums">ORD-4471</span> · Table 6
          </CardDescription>
        </div>
        <StatusChip status="late" label="Late 6 min" />
      </CardHeader>
      <CardBody>
        <p className="font-sans text-sm text-ink-2">
          Promised at 20:08. The rider is waiting at Hyderabadi Dum.
        </p>
      </CardBody>
      <CardFooter className="flex-col gap-2">
        <Button variant="primary" size="lg" block>
          Mark ready
        </Button>
        <Button variant="outline" size="lg" block>
          Need 5 more minutes
        </Button>
      </CardFooter>
    </Card>
  ),
};

export const FocusVisibleInside: Story = {
  name: "Focus-visible lives on the controls",
  parameters: {
    docs: {
      description: {
        story:
          "The card itself is never a focus target — it is a `div` with no tab stop, and giving a container a ring would tell the keyboard user nothing about what Enter would do. The ring belongs to the buttons in the footer; the play function tabs onto the first one.",
      },
    },
  },
  render: () => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Crust &amp; Coal</CardTitle>
        <StatusChip status="out_for_delivery" />
      </CardHeader>
      <CardBody>
        <p className="font-sans text-sm text-ink-2">
          Rider 1.2 km away. ETA 20:26.
        </p>
      </CardBody>
      <CardFooter>
        <Button variant="ghost">Call rider</Button>
        <Button variant="primary">Track ORD-4471</Button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const target = await canvas.findByRole("button", { name: "Call rider" });
    target.focus();
    await userEvent.tab({ shift: true });
    await userEvent.tab();
  },
};

export const DarkTheme: Story = {
  name: "Dark theme",
  globals: { theme: "dark" },
  parameters: {
    docs: {
      description: {
        story:
          "`--surface`, `--line` and every stripe hue are redefined for the dark ground in tokens.css, so the card needs no dark-specific class of its own.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-3">
      <OrderCard />
      {TONES.map((tone) => (
        <Card key={tone} stripe={tone} className="w-full max-w-md">
          <CardHeader>
            <div className="flex flex-col gap-0.5">
              <CardTitle>{STRIPE_MEANING[tone].split(" — ")[0]}</CardTitle>
              <CardDescription>{STRIPE_MEANING[tone].split(" — ")[1]}</CardDescription>
            </div>
            <Badge tone={tone}>{tone}</Badge>
          </CardHeader>
        </Card>
      ))}
    </div>
  ),
};
