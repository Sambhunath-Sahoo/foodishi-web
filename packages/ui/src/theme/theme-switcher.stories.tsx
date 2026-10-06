import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ThemeSwitcher } from "./theme-switcher";

const meta = {
  title: "Primitives/ThemeSwitcher",
  component: ThemeSwitcher,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Light / Dark / System, stored once for all three apps.",
          "",
          "- **compact** is a single 32px icon button showing the mode in force; it opens a",
          "  three-item menu with a check on the active choice. Use it in a dense header,",
          "  beside the account block.",
          "- **labelled** (the default) is three segments with words, for a settings page or",
          "  a sign-in screen where there is room to say them.",
          "",
          "Picking a mode really changes the canvas theme — that is the control's job.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof ThemeSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Labelled: Story = {};

export const Compact: Story = {
  args: { compact: true },
  render: (args) => (
    // Room underneath, so the opened menu is not clipped by the canvas.
    <div className="flex h-40 items-start justify-end">
      <ThemeSwitcher {...args} />
    </div>
  ),
};

export const Stretched: Story = {
  name: "Labelled, full width",
  parameters: {
    docs: {
      description: {
        story:
          "How the customer profile and the partner account menu use it: the segments stretch to fill a card with `[&>button]:flex-1`.",
      },
    },
  },
  render: () => (
    <div className="w-[320px]">
      <ThemeSwitcher className="flex w-full [&>button]:min-h-11 [&>button]:flex-1 [&>button]:justify-center" />
    </div>
  ),
};
