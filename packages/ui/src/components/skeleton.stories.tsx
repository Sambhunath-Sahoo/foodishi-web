import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Card, CardBody, CardHeader } from "./card";
import { Skeleton, SkeletonRows } from "./skeleton";

const meta = {
  title: "Primitives/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Reach for **Skeleton** on a first load where you already know the *shape* of what",
          "is coming — the order board, a payout table, a restaurant's menu. Holding the",
          "layout still while the data lands stops the page from jumping under a thumb that",
          "is already moving toward a button.",
          "",
          "Do not use it for:",
          "",
          "- **A refetch of data already on screen.** Replacing a visible board with grey bars",
          "  is a downgrade; dim the rows or show a quiet spinner instead.",
          "- **An action in flight.** That is `Button`'s `isPending`.",
          "- **An empty result.** That is `EmptyState` — a skeleton that never resolves reads",
          "  as a hang.",
          "",
          "Every skeleton carries `role=\"status\"` and an `aria-label`. Set `label` to what is",
          "actually loading (\"Loading today's orders\") so a screen reader is told the page is",
          "busy rather than being handed a silent grey box.",
        ].join("\n"),
      },
    },
  },
  argTypes: {
    label: { control: "text" },
    className: { control: "text" },
  },
  args: {
    label: "Loading today's orders",
    className: "h-7 w-64",
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

const CAPTION = "font-sans text-[12px] uppercase tracking-wide text-ink-3";

export const Default: Story = {
  args: { className: "h-7 w-64", label: "Loading today's orders" },
};

export const Shapes: Story = {
  name: "Sizing is the caller's job",
  parameters: {
    docs: {
      description: {
        story:
          "`Skeleton` ships only the pulse, the `--surface-2` ground and the card radius. Width and height come from the caller, because only the caller knows what shape the real content will be.",
      },
    },
  },
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className={CAPTION}>a line of text</span>
        <Skeleton className="h-4 w-48" label="Loading restaurant name" />
      </div>
      <div className="flex flex-col gap-2">
        <span className={CAPTION}>a paragraph</span>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-full" label="Loading order notes" />
          <Skeleton className="h-3 w-full" label="Loading order notes" />
          <Skeleton className="h-3 w-2/3" label="Loading order notes" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className={CAPTION}>a dish thumbnail</span>
        <Skeleton className="size-16" label="Loading dish photo" />
      </div>
      <div className="flex flex-col gap-2">
        <span className={CAPTION}>a button</span>
        <Skeleton className="h-10 w-32" label="Loading action" />
      </div>
    </div>
  ),
};

export const Rows: Story = {
  name: "SkeletonRows — a table in flight",
  parameters: {
    docs: {
      description: {
        story:
          "`SkeletonRows` is the shortcut for the common case: a list whose row height you know and whose length you do not. Five rows is the default because it fills an operator viewport without pretending to know the page size.",
      },
    },
  },
  render: () => (
    <div className="max-w-2xl rounded-card border border-line bg-surface">
      <SkeletonRows />
    </div>
  ),
};

export const RowCounts: Story = {
  name: "SkeletonRows — chosen counts",
  render: () => (
    <div className="flex max-w-2xl flex-col gap-4">
      {[3, 5, 8].map((rows) => (
        <div key={rows} className="flex flex-col gap-2">
          <span className={CAPTION}>{rows} rows</span>
          <div className="rounded-card border border-line bg-surface">
            <SkeletonRows rows={rows} />
          </div>
        </div>
      ))}
    </div>
  ),
};

export const CardLoading: Story = {
  name: "A card in flight",
  parameters: {
    docs: {
      description: {
        story:
          "Match the skeleton to the card it replaces — same header, same three lines, same footer height — so the layout does not shift the instant ORD-4471 arrives.",
      },
    },
  },
  render: () => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-36" label="Loading restaurant name" />
          <Skeleton className="h-3 w-24" label="Loading order id" />
        </div>
        <Skeleton className="h-5 w-20" label="Loading order status" />
      </CardHeader>
      <CardBody>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-full" label="Loading order items" />
          <Skeleton className="h-3.5 w-full" label="Loading order items" />
          <Skeleton className="h-3.5 w-3/4" label="Loading order items" />
        </div>
      </CardBody>
    </Card>
  ),
};

export const NoVariantsOrFocus: Story = {
  name: "No variants, no focus, no disabled",
  parameters: {
    docs: {
      description: {
        story:
          "There is deliberately one skeleton and one colour. A skeleton with tones would be encoding a state for content that does not exist yet. It takes no focus and has no disabled state — it is a placeholder, and the tab order should skip straight to whatever is already interactive on the page.",
      },
    },
  },
  render: () => (
    <div className="flex max-w-md flex-col gap-2">
      <Skeleton className="h-4 w-52" label="Loading today's orders" />
      <Skeleton className="h-4 w-40" label="Loading today's orders" />
    </div>
  ),
};

export const DarkTheme: Story = {
  name: "Dark theme",
  globals: { theme: "dark" },
  parameters: {
    docs: {
      description: {
        story:
          "The ground is `--surface-2`, which in dark is a step *lighter* than the surface rather than darker. The pulse reads the same either way.",
      },
    },
  },
  render: () => (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-48" label="Loading restaurant name" />
        <Skeleton className="h-3 w-32" label="Loading order id" />
      </div>
      <div className="rounded-card border border-line bg-surface">
        <SkeletonRows rows={4} />
      </div>
    </div>
  ),
};
