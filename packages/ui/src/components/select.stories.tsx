import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { Field } from "./input";
import { Select, type SelectOption } from "./select";

const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: "pending", label: "Pending" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready for pickup" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const RESTAURANT_OPTIONS: readonly SelectOption[] = [
  { value: "tandoori-nights", label: "Tandoori Nights" },
  { value: "hyderabadi-dum", label: "Hyderabadi Dum" },
  { value: "crust-and-coal", label: "Crust & Coal" },
  { value: "idli-factory", label: "Idli Factory" },
];

const REFUND_REASONS: readonly SelectOption[] = [
  { value: "item_unavailable", label: "Item unavailable — Mirchi Ka Salan" },
  { value: "late_delivery", label: "Late delivery — SLA breached" },
  { value: "quality", label: "Quality complaint" },
  { value: "wrong_order", label: "Wrong order delivered" },
];

const meta = {
  title: "Primitives/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Reach for **Select** when the answer comes from a closed list the server already",
          "knows — an order status, a restaurant, a refund reason. Below roughly a dozen",
          "options it beats a search box; above that, and for anything the operator would",
          "rather type than scroll, use a search field instead.",
          "",
          "It is a **native `<select>` on purpose**. Partner runs on a tablet and customer on",
          "a phone, where the platform's own picker — a full-height wheel the thumb already",
          "knows — beats any listbox we would draw, and keeps working with a screen reader,",
          "a hardware keyboard and a greasy glove.",
          "",
          "`placeholder` prepends an empty-valued option, so use it only where \"no filter\" or",
          "\"not chosen yet\" is a legitimate answer. `error` behaves exactly as it does on",
          "`Input`: print the server's sentence, and the `--crit` border comes with it.",
        ].join("\n"),
      },
    },
  },
  argTypes: {
    error: { control: "text" },
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
  },
  args: {
    id: "order-status",
    options: STATUS_OPTIONS,
    placeholder: "Any status",
    disabled: false,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const STACK = "flex max-w-sm flex-col gap-5";
const CAPTION = "font-sans text-[12px] uppercase tracking-wide text-ink-3";

export const Default: Story = {
  args: { id: "order-status", options: STATUS_OPTIONS, placeholder: "Any status" },
};

export const WithField: Story = {
  name: "With label and hint",
  render: () => (
    <Field
      label="Order status"
      htmlFor="order-status-labelled"
      hint="Filters the board. Cleared on shift handover."
    >
      <Select
        id="order-status-labelled"
        options={STATUS_OPTIONS}
        placeholder="Any status"
      />
    </Field>
  ),
};

export const NoPlaceholder: Story = {
  name: "Without a placeholder",
  parameters: {
    docs: {
      description: {
        story:
          "Drop the placeholder when every order has a restaurant and \"unset\" is not a state the server accepts. An empty option the API would reject is a bug waiting for a slow Tuesday.",
      },
    },
  },
  render: () => (
    <Field label="Restaurant" htmlFor="restaurant-required">
      <Select
        id="restaurant-required"
        options={RESTAURANT_OPTIONS}
        defaultValue="hyderabadi-dum"
      />
    </Field>
  ),
};

export const ServerError: Story = {
  name: "Error — the server's own message",
  parameters: {
    docs: {
      description: {
        story:
          "Same contract as `Input`: `--crit` border, the API's sentence printed underneath, `aria-invalid` and `aria-describedby` wired to it.",
      },
    },
  },
  render: () => (
    <Field label="Refund reason" htmlFor="refund-reason-error">
      <Select
        id="refund-reason-error"
        options={REFUND_REASONS}
        placeholder="Choose a reason"
        error="Refund reason is required before a refund can be issued"
      />
    </Field>
  ),
};

export const States: Story = {
  name: "Every state",
  render: () => (
    <div className={STACK}>
      <div className="flex flex-col gap-1.5">
        <span className={CAPTION}>placeholder showing</span>
        <Select id="sel-empty" options={STATUS_OPTIONS} placeholder="Any status" />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={CAPTION}>a value chosen</span>
        <Select id="sel-chosen" options={STATUS_OPTIONS} defaultValue="preparing" />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={CAPTION}>error</span>
        <Select
          id="sel-error"
          options={REFUND_REASONS}
          placeholder="Choose a reason"
          error="Refund reason is required before a refund can be issued"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={CAPTION}>disabled</span>
        <Select
          id="sel-disabled"
          options={RESTAURANT_OPTIONS}
          defaultValue="idli-factory"
          disabled
        />
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    id: "select-disabled",
    options: RESTAURANT_OPTIONS,
    defaultValue: "crust-and-coal",
    disabled: true,
    placeholder: undefined,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Use for a field this role may read but not change — a partner user looking at the restaurant their account is pinned to.",
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
          "The same 2px `--accent` outline at 1px offset the text field uses, so a form of mixed controls has one focus language.",
      },
    },
  },
  render: () => (
    <Field label="Order status" htmlFor="select-focus">
      <Select id="select-focus" options={STATUS_OPTIONS} placeholder="Any status" />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const target = await canvas.findByLabelText("Order status");
    target.focus();
    await userEvent.tab({ shift: true });
    await userEvent.tab();
  },
};

export const DarkTheme: Story = {
  name: "Dark theme",
  globals: { theme: "dark" },
  render: () => (
    <div className={STACK}>
      <Field label="Order status" htmlFor="dark-status">
        <Select id="dark-status" options={STATUS_OPTIONS} defaultValue="out_for_delivery" />
      </Field>
      <Field label="Refund reason" htmlFor="dark-reason">
        <Select
          id="dark-reason"
          options={REFUND_REASONS}
          placeholder="Choose a reason"
          error="Refund reason is required before a refund can be issued"
        />
      </Field>
      <Field label="Restaurant" htmlFor="dark-restaurant">
        <Select
          id="dark-restaurant"
          options={RESTAURANT_OPTIONS}
          defaultValue="tandoori-nights"
          disabled
        />
      </Field>
    </div>
  ),
};
