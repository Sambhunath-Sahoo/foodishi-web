import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { SegmentedControl, type SegmentedOption } from "./segmented-control";

type BoardFilter = "all" | "pending" | "preparing" | "out" | "late";

const BOARD_TABS: readonly SegmentedOption<BoardFilter>[] = [
  { value: "all", label: "All", count: 42 },
  { value: "pending", label: "Pending", count: 6 },
  { value: "preparing", label: "Preparing", count: 11 },
  { value: "out", label: "Out for delivery", count: 22 },
  { value: "late", label: "Late", count: 3 },
];

type Density = "day" | "week" | "month";

const RANGE_TABS: readonly SegmentedOption<Density>[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

const meta = {
  title: "Primitives/SegmentedControl",
  component: SegmentedControl<BoardFilter>,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Reach for **SegmentedControl** when a screen shows one slice of the same list at a",
          "time and every slice matters — the order board filtered by state, a report over",
          "day / week / month. All the choices stay visible, so the operator can see that",
          "three orders are late without opening anything.",
          "",
          "Choose something else when:",
          "",
          "- there are more than about five options, or the labels are long — that is a",
          "  `Select`, or a row of filter chips;",
          "- the choices are independent rather than exclusive — those are checkboxes;",
          "- picking one navigates to a different screen — those are tabs or links.",
          "",
          "`count` is the reason this component earns its space on the operator board. A",
          "segment reading \"Late 3\" is a standing alarm that costs no extra pixels; the",
          "numbers are `tabular-nums` so they do not jitter as the board ticks.",
          "",
          "It is a controlled component: `value` in, `onValueChange` out. It renders a real",
          "`tablist` with `aria-selected`, and scrolls inside itself on a narrow screen rather",
          "than pushing the page sideways (DESIGN.md #4).",
        ].join("\n"),
      },
    },
  },
  args: {
    options: BOARD_TABS,
    value: "all",
    ariaLabel: "Filter the order board",
    onValueChange: () => undefined,
  },
} satisfies Meta<typeof SegmentedControl<BoardFilter>>;

export default meta;
type Story = StoryObj<typeof meta>;

const CAPTION = "font-sans text-[12px] uppercase tracking-wide text-ink-3";

function BoardFilterDemo({
  initial = "all",
  options = BOARD_TABS,
}: {
  readonly initial?: BoardFilter;
  readonly options?: readonly SegmentedOption<BoardFilter>[];
}): React.JSX.Element {
  const [value, setValue] = React.useState<BoardFilter>(initial);
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        options={options}
        value={value}
        onValueChange={setValue}
        ariaLabel="Filter the order board"
      />
      <p className="font-sans text-[13px] text-ink-3">
        Showing{" "}
        <span className="text-ink">
          {options.find((option) => option.value === value)?.label}
        </span>{" "}
        — <span className="font-mono tabular-nums">ORD-4471</span>,{" "}
        <span className="font-mono tabular-nums">ORD-4468</span> and the rest of the
        board.
      </p>
    </div>
  );
}

export const Default: Story = {
  render: () => <BoardFilterDemo />,
};

export const WithCounts: Story = {
  name: "With counts",
  parameters: {
    docs: {
      description: {
        story:
          "The counts are the point: \"Late 3\" is visible before anyone taps anything. Click through the segments — the selection is real state, not a hover effect.",
      },
    },
  },
  render: () => <BoardFilterDemo />,
};

export const WithoutCounts: Story = {
  name: "Without counts",
  parameters: {
    docs: {
      description: {
        story:
          "Drop `count` when the number is not actionable. A date range has no backlog to report, and an empty number would just be noise.",
      },
    },
  },
  render: function RangeDemo() {
    const [value, setValue] = React.useState<Density>("day");
    return (
      <div className="flex flex-col gap-3">
        <SegmentedControl
          options={RANGE_TABS}
          value={value}
          onValueChange={setValue}
          ariaLabel="Report range"
        />
        <p className="font-sans text-[13px] text-ink-3">
          Payouts for{" "}
          <span className="text-ink">
            {RANGE_TABS.find((option) => option.value === value)?.label}
          </span>
          : <span className="font-mono tabular-nums">₹1,248.50</span> settled.
        </p>
      </div>
    );
  },
};

export const EverySelection: Story = {
  name: "Every segment selected",
  parameters: {
    docs: {
      description: {
        story:
          "Selection is carried by a `--surface` ground plus the card shadow against the `--surface-2` track, and by `aria-selected` — not by colour alone. First, middle and last selections all keep the 0.5 track padding.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-4">
      {BOARD_TABS.map((tab) => (
        <div key={tab.value} className="flex flex-col gap-2">
          <span className={CAPTION}>{tab.label} selected</span>
          <SegmentedControl
            options={BOARD_TABS}
            value={tab.value}
            onValueChange={() => undefined}
            ariaLabel="Filter the order board"
          />
        </div>
      ))}
    </div>
  ),
};

export const TwoSegments: Story = {
  name: "Two segments",
  parameters: {
    docs: {
      description: {
        story:
          "The smallest useful size. With two mutually exclusive choices this reads faster than a switch, because both labels are spelled out instead of one being implied.",
      },
    },
  },
  render: function TwoDemo() {
    const [value, setValue] = React.useState<"open" | "closed">("open");
    return (
      <SegmentedControl
        options={[
          { value: "open", label: "Accepting orders", count: 42 },
          { value: "closed", label: "Kitchen closed" },
        ]}
        value={value}
        onValueChange={setValue}
        ariaLabel="Hyderabadi Dum availability"
      />
    );
  },
};

export const Overflow: Story = {
  name: "Overflow scrolls inside itself",
  parameters: {
    docs: {
      description: {
        story:
          "Wide content scrolls inside its own container; the page body never scrolls sideways (DESIGN.md #4). Squeeze the frame and the track scrolls, the layout does not break.",
      },
    },
  },
  render: () => (
    <div className="max-w-xs rounded-card border border-dashed border-line-2 p-2">
      <SegmentedControl
        options={BOARD_TABS}
        value="preparing"
        onValueChange={() => undefined}
        ariaLabel="Filter the order board"
        className="w-full"
      />
    </div>
  ),
};

export const FocusVisible: Story = {
  name: "Focus-visible ring",
  parameters: {
    docs: {
      description: {
        story:
          "Each segment is a real button, so every one is a tab stop and every one takes the 2px `--accent` ring at 1px offset. The play function tabs onto the first segment.",
      },
    },
  },
  render: () => (
    <SegmentedControl
      options={RANGE_TABS}
      value="day"
      onValueChange={() => undefined}
      ariaLabel="Report range"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const target = await canvas.findByRole("tab", { name: "Today" });
    target.focus();
    await userEvent.tab({ shift: true });
    await userEvent.tab();
  },
};

export const NoDisabledState: Story = {
  name: "No disabled state",
  parameters: {
    docs: {
      description: {
        story:
          "A segment has no disabled variant, and that is deliberate: a filter that cannot be chosen should not be on the board at all. If \"Late\" is meaningless for this restaurant, omit the option rather than greying it — a dead segment still costs the operator a glance every time they scan the row.",
      },
    },
  },
  render: () => (
    <BoardFilterDemo
      initial="pending"
      options={BOARD_TABS.filter((tab) => tab.value !== "late")}
    />
  ),
};

export const DarkTheme: Story = {
  name: "Dark theme",
  globals: { theme: "dark" },
  parameters: {
    docs: {
      description: {
        story:
          "The track/selected contrast inverts through the tokens: in dark, `--surface` is lighter than `--surface-2`, so the selected segment still lifts off the track.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <BoardFilterDemo initial="late" />
      <SegmentedControl
        options={RANGE_TABS}
        value="week"
        onValueChange={() => undefined}
        ariaLabel="Report range"
      />
    </div>
  ),
};
