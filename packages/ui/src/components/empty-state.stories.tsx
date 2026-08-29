import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { EmptyState } from "./empty-state";

const meta = {
  title: "Domain/EmptyState",
  component: EmptyState,
  parameters: {
    docs: {
      description: {
        component:
          "Empty states say what would appear here (DESIGN.md copy rules). " +
          "\"No breached refunds — every refund is inside its SLA\" beats a " +
          "blank panel, because it tells the operator the panel is working.",
      },
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Operator: the panel is empty because the SLA is being met, not because it broke. */
export const NoBreachedRefunds: Story = {
  args: {
    title: "No breached refunds — every refund is inside its SLA",
    detail:
      "A refund that passes 48 hours without settling appears here with its payment ref and the minutes overdue.",
  },
};

/** Partner: the kitchen tablet between rushes. */
export const KitchenIsClear: Story = {
  args: {
    title: "No orders waiting — the Tandoori Nights kitchen is clear",
    detail:
      "New orders appear here the moment a customer pays, with a sound and the promised time already on the card.",
  },
};

/** Customer: an empty history is an invitation, not a dead end. */
export const NoPastOrders: Story = {
  args: {
    title: "No orders yet — your first Mutton Dum Biryani is one tap away",
    detail:
      "Every order you place shows up here with its bill, its rider and a reorder button.",
    action: <Button size="md">Browse restaurants near you</Button>,
  },
};

/** A filter, not the data, is what emptied this list — so offer the way back. */
export const NoRowsMatchTheFilter: Story = {
  args: {
    title: "No orders from Idli Factory between 14:00 and 16:00",
    detail:
      "There were 43 orders in that window from the other three restaurants. Widen the range or clear the restaurant filter.",
    action: (
      <Button variant="ghost" size="sm">
        Clear filters
      </Button>
    ),
  },
};
