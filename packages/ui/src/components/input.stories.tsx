import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { Field, Input } from "./input";

const meta = {
  title: "Primitives/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Reach for **Input** for a single free-text or numeric value the operator types —",
          "a coupon code, a refund amount, an order id to jump to. Anything with a known set",
          "of answers belongs in `Select`; anything longer than a line belongs in a textarea.",
          "",
          "Two rules carry most of the value here:",
          "",
          "- **`error` takes the server's own sentence, not ours.** The API answers a bad",
          "  coupon with *\"Coupon has reached its usage limit\"* or *\"Order must be at least",
          "  599 to use this coupon\"*. Print that. \"Invalid coupon\" throws away the only",
          "  thing the operator needed to know, which is what to do next.",
          "- **`mono` for anything a human reads back digit by digit** — order ids, provider",
          "  refs, money. IBM Plex Mono plus `tabular-nums` keeps `₹1,248.50` from shifting",
          "  as it is typed.",
          "",
          "Always pair with `Field`, which owns the label, the `htmlFor` wiring and the hint.",
          "The error is rendered by `Input` itself so `aria-describedby` and `aria-invalid`",
          "stay in step with the border colour.",
        ].join("\n"),
      },
    },
  },
  argTypes: {
    error: { control: "text" },
    mono: { control: "boolean" },
    disabled: { control: "boolean" },
    placeholder: { control: "text" },
  },
  args: {
    id: "coupon-code",
    placeholder: "FOODISHI20",
    mono: false,
    disabled: false,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

const STACK = "flex max-w-sm flex-col gap-5";
const CAPTION = "font-sans text-[12px] uppercase tracking-wide text-ink-3";

export const Default: Story = {
  args: { id: "coupon-code", placeholder: "FOODISHI20" },
};

export const WithField: Story = {
  name: "With label and hint",
  parameters: {
    docs: {
      description: {
        story:
          "`Field` is the wrapper you almost always want — it binds the label to the control and hangs the hint underneath.",
      },
    },
  },
  render: () => (
    <Field
      label="Coupon code"
      htmlFor="coupon-code-hinted"
      hint="Case-insensitive. One coupon per order."
    >
      <Input id="coupon-code-hinted" placeholder="FOODISHI20" defaultValue="FOODISHI20" mono />
    </Field>
  ),
};

export const ServerError: Story = {
  name: "Error — the server's own message",
  args: {
    id: "coupon-code-exhausted",
    defaultValue: "SOLDOUT",
    mono: true,
    error: "Coupon has reached its usage limit",
  },
  parameters: {
    docs: {
      description: {
        story: [
          "The API rejected `SOLDOUT` with **\"Coupon has reached its usage limit\"** and that",
          "exact sentence is what the customer sees. It tells them the code was real, that",
          "the problem is not their typing, and that retrying will not help — none of which",
          "survives a generic \"Invalid coupon\".",
          "",
          "The state is carried three ways, not by colour alone: the border switches to",
          "`--crit`, the message is printed in words, and the field gets `aria-invalid` plus",
          "an `aria-describedby` pointing at the message.",
        ].join("\n"),
      },
    },
  },
  render: (args) => (
    <Field label="Coupon code" htmlFor="coupon-code-exhausted">
      <Input {...args} />
    </Field>
  ),
};

export const ErrorVariations: Story = {
  name: "Other real server messages",
  parameters: {
    docs: {
      description: {
        story:
          "Every one of these came back from the API as written. None of them is a message we invented in the client.",
      },
    },
  },
  render: () => (
    <div className={STACK}>
      <Field label="Coupon code" htmlFor="coupon-exhausted">
        <Input
          id="coupon-exhausted"
          mono
          defaultValue="SOLDOUT"
          error="Coupon has reached its usage limit"
        />
      </Field>
      <Field label="Coupon code" htmlFor="coupon-expired">
        <Input
          id="coupon-expired"
          mono
          defaultValue="EXPIRED25"
          error="Coupon expired on 12 Aug 2026"
        />
      </Field>
      <Field label="Coupon code" htmlFor="coupon-minimum">
        <Input
          id="coupon-minimum"
          mono
          defaultValue="FOODISHI20"
          error="Order must be at least 599 to use this coupon"
        />
      </Field>
      <Field label="Refund amount" htmlFor="refund-over">
        <Input
          id="refund-over"
          mono
          defaultValue="1,600.00"
          error="Refund exceeds the ₹1,248.50 captured on ORD-4471"
        />
      </Field>
    </div>
  ),
};

export const Mono: Story = {
  name: "Mono — ids and money",
  parameters: {
    docs: {
      description: {
        story:
          "`mono` switches to IBM Plex Mono with `tabular-nums`, so digits keep their column while the operator types and an order id can be read back over a phone.",
      },
    },
  },
  render: () => (
    <div className={STACK}>
      <Field label="Order id" htmlFor="order-id" hint="Paste from the partner's ticket.">
        <Input id="order-id" mono defaultValue="ORD-4471" />
      </Field>
      <Field label="Refund amount" htmlFor="refund-amount">
        <Input id="refund-amount" mono inputMode="decimal" defaultValue="1,248.50" />
      </Field>
      <Field label="Not mono, for contrast" htmlFor="restaurant-name">
        <Input id="restaurant-name" defaultValue="Hyderabadi Dum" />
      </Field>
    </div>
  ),
};

export const States: Story = {
  name: "Every state",
  render: () => (
    <div className={STACK}>
      <div className="flex flex-col gap-1.5">
        <span className={CAPTION}>empty</span>
        <Input id="state-empty" placeholder="FOODISHI20" />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={CAPTION}>filled</span>
        <Input id="state-filled" defaultValue="Mirchi Ka Salan" />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={CAPTION}>error</span>
        <Input
          id="state-error"
          mono
          defaultValue="SOLDOUT"
          error="Coupon has reached its usage limit"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={CAPTION}>read-only</span>
        <Input id="state-readonly" mono defaultValue="ORD-4471" readOnly />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={CAPTION}>disabled</span>
        <Input id="state-disabled" defaultValue="Tandoori Nights" disabled />
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    id: "input-disabled",
    defaultValue: "Idli Factory",
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Disabled drops the ground to `--surface-2` and the ink to `--ink-4`, and shows a not-allowed cursor. Use it for a field the current role cannot edit, not for a field that is merely empty.",
      },
    },
  },
};

export const FocusVisible: Story = {
  name: "Focus-visible ring",
  parameters: {
    docs: {
      description: {
        story:
          "A 2px `--accent` outline at 1px offset — tighter than the button's, because a field sits inside a form grid where 2px of offset would collide with its neighbour.",
      },
    },
  },
  render: () => (
    <Field label="Coupon code" htmlFor="coupon-focus">
      <Input id="coupon-focus" mono placeholder="FOODISHI20" />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const target = await canvas.findByLabelText("Coupon code");
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
          "The error border and message ride `--crit`, which is redefined for the dark ground in tokens.css. The component is unchanged.",
      },
    },
  },
  render: () => (
    <div className={STACK}>
      <Field label="Coupon code" htmlFor="dark-coupon" hint="One coupon per order.">
        <Input id="dark-coupon" mono defaultValue="FOODISHI20" />
      </Field>
      <Field label="Coupon code" htmlFor="dark-coupon-error">
        <Input
          id="dark-coupon-error"
          mono
          defaultValue="SOLDOUT"
          error="Coupon has reached its usage limit"
        />
      </Field>
      <Field label="Restaurant" htmlFor="dark-disabled">
        <Input id="dark-disabled" defaultValue="Crust & Coal" disabled />
      </Field>
    </div>
  ),
};
