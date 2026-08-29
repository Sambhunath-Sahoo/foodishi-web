import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "./badge";
import { StatusChip } from "./status-chip";
import type { Tone } from "../status/tone";

const meta = {
  title: "Primitives/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Reach for **Badge** to label a thing that is *already on screen* — the state of the",
          "order in this row, the tag on this dish, the count on this filter. It is a label,",
          "not a control: if tapping it should do something, that is a `Button` or a link.",
          "",
          "Use `StatusChip` instead when the label is an order status; that component owns the",
          "status → tone mapping so no screen invents its own.",
          "",
          "**The dot is not decoration.** Colour never carries meaning alone (DESIGN.md #3),",
          "and an operator with deuteranopia reads `--ok` green and `--crit` red as the same",
          "muddy tone. The dot plus the word carry the state; the hue only makes it fast for",
          "everyone else. Turn `dot` off only for a badge that is pure decoration — a count,",
          "a version tag — where there is no state to encode.",
          "",
          "Tones map to meaning, never to taste: `ok` delivered/captured/veg, `warn`",
          "preparing/SLA approaching, `crit` late/breached/cancelled, `cool` out for delivery,",
          "`mute` pending, `accent` selected or structural.",
        ].join("\n"),
      },
    },
  },
  argTypes: {
    tone: {
      control: "inline-radio",
      options: ["accent", "ok", "warn", "crit", "cool", "mute"],
    },
    dot: { control: "boolean" },
  },
  args: {
    tone: "ok",
    dot: true,
    children: "Delivered",
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

const TONES: readonly Tone[] = ["accent", "ok", "warn", "crit", "cool", "mute"];

const TONE_LABEL: Record<Tone, string> = {
  accent: "Selected",
  ok: "Delivered",
  warn: "Preparing",
  crit: "SLA breached",
  cool: "Out for delivery",
  mute: "Pending",
};

const ROW = "flex flex-wrap items-center gap-2";
const CAPTION = "font-sans text-[12px] uppercase tracking-wide text-ink-3";

export const Default: Story = {
  args: { tone: "ok", children: "Delivered" },
};

export const EveryTone: Story = {
  name: "Every tone",
  parameters: {
    docs: {
      description: {
        story:
          "Each tone is a soft ground, a solid ink and a 25%-opacity border drawn from one token, plus the dot. Read the labels: the badge works without the colour.",
      },
    },
  },
  render: () => (
    <div className={ROW}>
      {TONES.map((tone) => (
        <Badge key={tone} tone={tone}>
          {TONE_LABEL[tone]}
        </Badge>
      ))}
    </div>
  ),
};

export const WithAndWithoutDot: Story = {
  name: "The dot is the point",
  parameters: {
    docs: {
      description: {
        story: [
          "Top row keeps the dot: state. Bottom row drops it: decoration.",
          "",
          "The bottom row is what a colour-blind operator sees in the top row if the dot were",
          "removed — six pills that differ only by a hue they cannot separate. Keep `dot` on",
          "for anything that means something.",
        ].join("\n"),
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className={CAPTION}>dot on — state</span>
        <div className={ROW}>
          {TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {TONE_LABEL[tone]}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className={CAPTION}>dot off — decoration only</span>
        <div className={ROW}>
          <Badge tone="accent" dot={false}>
            v2.4.1
          </Badge>
          <Badge tone="mute" dot={false}>
            12 items
          </Badge>
          <Badge tone="ok" dot={false}>
            Veg
          </Badge>
        </div>
      </div>
    </div>
  ),
};

export const InContext: Story = {
  name: "In context",
  parameters: {
    docs: {
      description: {
        story:
          "Badges only make sense next to the thing they describe. Here they sit against real menu and order content rather than in a swatch grid.",
      },
    },
  },
  render: () => (
    <div className="flex max-w-md flex-col gap-3 font-sans text-sm text-ink">
      <div className="flex items-center justify-between gap-3">
        <span>Mutton Dum Biryani</span>
        <div className={ROW}>
          <Badge tone="crit" dot={false}>
            Non-veg
          </Badge>
          <Badge tone="ok">Available</Badge>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span>Masala Dosa</span>
        <div className={ROW}>
          <Badge tone="ok" dot={false}>
            Veg
          </Badge>
          <Badge tone="mute">Sold out today</Badge>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono tabular-nums">ORD-4471</span>
        <StatusChip status="late" label="Late 6 min" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono tabular-nums">ORD-4468</span>
        <StatusChip status="out_for_delivery" />
      </div>
    </div>
  ),
};

export const LongLabel: Story = {
  name: "Long labels do not wrap",
  parameters: {
    docs: {
      description: {
        story:
          "The badge is `whitespace-nowrap` by design — a status broken across two lines wrecks a dense table row. Keep labels to two or three words; if the sentence is longer, it belongs in the row, not the chip.",
      },
    },
  },
  render: () => (
    <div className={ROW}>
      <Badge tone="warn">SLA due in 4 min</Badge>
      <Badge tone="crit">Payment capture failed</Badge>
      <Badge tone="ok">Refund ₹1,248.50 settled</Badge>
    </div>
  ),
};

export const NoFocusOrDisabled: Story = {
  name: "No focus or disabled state",
  parameters: {
    docs: {
      description: {
        story:
          "Badge renders a `span`. It takes no focus and has no disabled state on purpose — a label that looked focusable would promise an action it cannot deliver. If you catch yourself wanting a disabled badge, what you want is a different tone or a different word.",
      },
    },
  },
  render: () => (
    <div className={ROW}>
      <Badge tone="mute">Pending</Badge>
      <Badge tone="mute" dot={false}>
        Not applicable
      </Badge>
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
          "Every soft ground has a dark counterpart in tokens.css. The border stays a 25% wash of the same tone so the chip keeps its edge on the darker surface.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <div className={ROW}>
        {TONES.map((tone) => (
          <Badge key={tone} tone={tone}>
            {TONE_LABEL[tone]}
          </Badge>
        ))}
      </div>
      <div className={ROW}>
        {TONES.map((tone) => (
          <Badge key={tone} tone={tone} dot={false}>
            {TONE_LABEL[tone]}
          </Badge>
        ))}
      </div>
    </div>
  ),
};
