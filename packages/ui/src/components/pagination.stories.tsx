import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { Pagination } from "./pagination";

const meta = {
  title: "Primitives/Pagination",
  component: Pagination,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Reach for **Pagination** at the foot of any list backed by the API's",
          "`{ items, total, limit, offset }` contract — the order board, payouts, the refund",
          "queue. It exists to keep an unbounded query off the wire: nobody renders eleven",
          "thousand orders, and a list with no ceiling is a slow outage waiting for a busy",
          "Friday.",
          "",
          "Prefer it over infinite scroll anywhere the operator needs to *come back* to a row",
          "they saw a minute ago. \"Page 3 of the refund queue\" is a place; an infinite feed",
          "is not, and a scroll position is not something you can say out loud to a colleague.",
          "",
          "It is fully controlled and stateless: it takes `total`, `limit` and `offset`,",
          "and hands back the next `offset`. It never fetches. The range line",
          "(`1–20 of 42 orders`) is `tabular-nums` so the digits do not jump as the offset",
          "moves, and `noun` is what keeps it saying \"orders\" or \"refunds\" rather than",
          "\"rows\".",
          "",
          "The two controls are `outline` `sm` buttons, so the footer never competes with the",
          "primary action on the page above it.",
        ].join("\n"),
      },
    },
  },
  argTypes: {
    total: { control: { type: "number", min: 0 } },
    limit: { control: { type: "number", min: 1 } },
    offset: { control: { type: "number", min: 0 } },
    noun: { control: "text" },
  },
  args: {
    total: 42,
    limit: 20,
    offset: 0,
    noun: "orders",
    onOffsetChange: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl rounded-card border border-line bg-surface">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

const CAPTION = "font-sans text-[12px] uppercase tracking-wide text-ink-3";

function LivePagination({
  total = 42,
  limit = 20,
  noun = "orders",
}: {
  readonly total?: number;
  readonly limit?: number;
  readonly noun?: string;
}): React.JSX.Element {
  const [offset, setOffset] = React.useState(0);
  return <Pagination total={total} limit={limit} offset={offset} onOffsetChange={setOffset} noun={noun} />;
}

export const Default: Story = {
  render: () => <LivePagination />,
  parameters: {
    docs: {
      description: {
        story:
          "Working state — page through 42 orders, 20 at a time, and watch the range line and the button states follow the offset.",
      },
    },
  },
};

export const FirstPage: Story = {
  name: "First page",
  args: { total: 42, limit: 20, offset: 0, noun: "orders" },
  parameters: {
    docs: {
      description: {
        story:
          "`Previous` is disabled rather than hidden. A control that disappears makes the footer reflow under a thumb already reaching for `Next`.",
      },
    },
  },
};

export const MiddlePage: Story = {
  name: "Middle page",
  args: { total: 42, limit: 20, offset: 20, noun: "orders" },
};

export const LastPage: Story = {
  name: "Last page — a partial run",
  args: { total: 42, limit: 20, offset: 40, noun: "orders" },
  parameters: {
    docs: {
      description: {
        story:
          "The last page holds two of a possible twenty, so the range reads `41–42 of 42` rather than `41–60`. `Next` is disabled.",
      },
    },
  },
};

export const SinglePage: Story = {
  name: "Everything fits on one page",
  args: { total: 12, limit: 20, offset: 0, noun: "refunds" },
  parameters: {
    docs: {
      description: {
        story:
          "Both controls are disabled and the count still prints. Keeping the footer means the operator can see there are exactly twelve refunds and no page two — a hidden footer leaves them wondering.",
      },
    },
  },
};

export const Empty: Story = {
  name: "No results",
  args: { total: 0, limit: 20, offset: 0, noun: "breached refunds" },
  parameters: {
    docs: {
      description: {
        story:
          "Zero total reads `0–0 of 0 breached refunds`. Pair it with an `EmptyState` above that says what would appear here — \"No breached refunds — every refund is inside its SLA\".",
      },
    },
  },
};

export const LargeTotals: Story = {
  name: "Large totals",
  args: { total: 11480, limit: 50, offset: 5000, noun: "orders" },
  parameters: {
    docs: {
      description: {
        story:
          "`tabular-nums` is doing the work here: the digits sit in fixed columns, so the range line does not shuffle sideways every time the operator taps `Next`.",
      },
    },
  },
};

export const Nouns: Story = {
  name: "Naming the rows",
  parameters: {
    docs: {
      description: {
        story:
          "Always pass `noun`. The default \"rows\" is a fallback, not a choice — an operator counting payouts should read \"payouts\".",
      },
    },
  },
  render: () => (
    <div className="flex flex-col divide-y divide-line">
      {(
        [
          ["orders", 42],
          ["refunds", 7],
          ["payouts", 118],
          ["menu items", 64],
        ] as const
      ).map(([noun, total]) => (
        <Pagination
          key={noun}
          total={total}
          limit={20}
          offset={0}
          onOffsetChange={() => undefined}
          noun={noun}
        />
      ))}
    </div>
  ),
};

export const DisabledEnds: Story = {
  name: "Disabled at both ends",
  parameters: {
    docs: {
      description: {
        story:
          "The three edge cases side by side: nothing before the first page, nothing after the last, and nothing at all when the list fits.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col divide-y divide-line">
      <div className="flex flex-col gap-1 p-2">
        <span className={CAPTION}>first page — Previous disabled</span>
        <Pagination total={42} limit={20} offset={0} onOffsetChange={() => undefined} noun="orders" />
      </div>
      <div className="flex flex-col gap-1 p-2">
        <span className={CAPTION}>last page — Next disabled</span>
        <Pagination total={42} limit={20} offset={40} onOffsetChange={() => undefined} noun="orders" />
      </div>
      <div className="flex flex-col gap-1 p-2">
        <span className={CAPTION}>single page — both disabled</span>
        <Pagination total={12} limit={20} offset={0} onOffsetChange={() => undefined} noun="refunds" />
      </div>
    </div>
  ),
};

export const FocusVisible: Story = {
  name: "Focus-visible ring",
  parameters: {
    docs: {
      description: {
        story:
          "Both controls are ordinary `Button`s, so they carry the standard 2px `--accent` ring at 2px offset. The play function tabs onto `Previous` on a middle page, where it is enabled.",
      },
    },
  },
  render: () => (
    <Pagination total={42} limit={20} offset={20} onOffsetChange={() => undefined} noun="orders" />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const target = await canvas.findByRole("button", { name: "Previous" });
    target.focus();
    await userEvent.tab({ shift: true });
    await userEvent.tab();
  },
};

export const DarkTheme: Story = {
  name: "Dark theme",
  globals: { theme: "dark" },
  render: () => (
    <div className="flex flex-col divide-y divide-line">
      <Pagination total={42} limit={20} offset={0} onOffsetChange={() => undefined} noun="orders" />
      <Pagination total={42} limit={20} offset={20} onOffsetChange={() => undefined} noun="orders" />
      <Pagination total={11480} limit={50} offset={5000} onOffsetChange={() => undefined} noun="orders" />
      <Pagination total={0} limit={20} offset={0} onOffsetChange={() => undefined} noun="breached refunds" />
    </div>
  ),
};
