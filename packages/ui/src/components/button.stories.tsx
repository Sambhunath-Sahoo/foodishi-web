import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { Button } from "./button";

const meta = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Reach for **Button** when a tap changes server state — accept an order, mark a",
          "ticket ready, issue a refund. Anything that only navigates is a link, not a button.",
          "",
          "Pick the variant by how much of the screen's authority the action deserves:",
          "",
          "- `primary` — the one action the operator came to this screen to take. One per view.",
          "- `outline` — a real alternative that sits beside the primary without competing.",
          "- `ghost` — repeated row-level actions and toolbar affordances, where four bordered",
          "  boxes in a row would out-shout the data.",
          "- `danger` — irreversible or money-moving. Outlined, never filled (see *Danger is",
          "  outlined*).",
          "",
          "Size follows the app's density, not the author's taste: `sm` for operator's dense",
          "desktop rows, `md` as the default, `lg` for partner's tablet where the kitchen is",
          "tapping with the side of a thumb.",
          "",
          "Label the consequence, not the verb: \"Cancel — ₹105 fee applies\" beats \"Cancel\".",
        ].join("\n"),
      },
    },
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["primary", "ghost", "outline", "danger"],
    },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    block: { control: "boolean" },
    disabled: { control: "boolean" },
    isPending: { control: "boolean" },
  },
  args: {
    children: "Accept order",
    variant: "primary",
    size: "md",
    disabled: false,
    isPending: false,
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const ROW = "flex flex-wrap items-center gap-3";
const STACK = "flex flex-col gap-5";
const CAPTION = "font-sans text-[12px] uppercase tracking-wide text-ink-3";

export const Primary: Story = {
  args: { variant: "primary", children: "Accept order" },
};

export const Ghost: Story = {
  args: { variant: "ghost", children: "View ORD-4471" },
  parameters: {
    docs: {
      description: {
        story:
          "Ghost carries no border until hover, so a column of forty order rows stays a table and not a grid of boxes.",
      },
    },
  },
};

export const Outline: Story = {
  args: { variant: "outline", children: "Print KOT" },
};

export const Danger: Story = {
  args: { variant: "danger", children: "Cancel — ₹105 fee applies" },
};

export const Large: Story = {
  args: { variant: "primary", size: "lg", children: "Mark Mutton Dum Biryani ready" },
  parameters: {
    docs: {
      description: {
        story:
          "`lg` is the partner tablet size: 48px tall, full width below the `sm` breakpoint so a busy kitchen never has to aim.",
      },
    },
  },
};

export const DangerIsOutlined: Story = {
  name: "Danger is outlined",
  parameters: {
    docs: {
      description: {
        story: [
          "**The destructive button is outlined, never filled** (DESIGN.md non-negotiable #5).",
          "",
          "A kitchen tablet should not carry a big red block next to the button tapped forty",
          "times an hour. \"Accept order\" is pressed all shift; \"Cancel order\" is pressed",
          "twice a week. A filled red rectangle beside a filled indigo one reads as *two*",
          "equally-weighted buttons at arm's length, and the fastest tap wins.",
          "",
          "Outlining keeps the crit hue — the row still reads as dangerous — while removing",
          "the mass that invites the accident. Note the fill: `danger` is transparent with a",
          "`--crit` border and `--crit` text; only `primary` carries a solid ground.",
        ].join("\n"),
      },
    },
  },
  render: () => (
    <div className={STACK}>
      <div className="flex flex-col gap-2">
        <span className={CAPTION}>The pairing as it ships</span>
        <div className={ROW}>
          <Button variant="primary">Accept order</Button>
          <Button variant="danger">Cancel — ₹105 fee applies</Button>
        </div>
        <p className="max-w-prose font-sans text-[13px] text-ink-3">
          Only one filled block on the row, and it belongs to the safe action.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className={CAPTION}>Danger across every size — still outlined</span>
        <div className={ROW}>
          <Button variant="danger" size="sm">
            Void ORD-4471
          </Button>
          <Button variant="danger" size="md">
            Refund ₹1,248.50
          </Button>
          <Button variant="danger" size="lg">
            Cancel — ₹105 fee applies
          </Button>
        </div>
      </div>
    </div>
  ),
};

export const AllVariants: Story = {
  name: "Every variant",
  render: () => (
    <div className={STACK}>
      <div className="flex flex-col gap-2">
        <span className={CAPTION}>primary</span>
        <div className={ROW}>
          <Button variant="primary">Accept order</Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className={CAPTION}>ghost</span>
        <div className={ROW}>
          <Button variant="ghost">View ORD-4471</Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className={CAPTION}>outline</span>
        <div className={ROW}>
          <Button variant="outline">Print KOT</Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className={CAPTION}>danger — outlined, never filled</span>
        <div className={ROW}>
          <Button variant="danger">Cancel — ₹105 fee applies</Button>
        </div>
      </div>
    </div>
  ),
};

export const AllSizes: Story = {
  name: "Every size",
  parameters: {
    docs: {
      description: {
        story:
          "`sm` 32px for operator's 13px table rows, `md` 40px everywhere else, `lg` 48px and full-width-on-mobile for the partner tablet.",
      },
    },
  },
  render: () => (
    <div className={STACK}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <div key={size} className="flex flex-col gap-2">
          <span className={CAPTION}>{size}</span>
          <div className={ROW}>
            <Button variant="primary" size={size}>
              Accept order
            </Button>
            <Button variant="outline" size={size}>
              Print KOT
            </Button>
            <Button variant="ghost" size={size}>
              View ORD-4471
            </Button>
            <Button variant="danger" size={size}>
              Refund ₹1,248.50
            </Button>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  name: "Disabled",
  parameters: {
    docs: {
      description: {
        story:
          "Disabled drops to 50% opacity and kills pointer events in every variant. Prefer an enabled button that explains the refusal on tap when the reason is worth reading — a dead control tells the kitchen nothing.",
      },
    },
  },
  render: () => (
    <div className={ROW}>
      <Button variant="primary" disabled>
        Accept order
      </Button>
      <Button variant="ghost" disabled>
        View ORD-4471
      </Button>
      <Button variant="outline" disabled>
        Print KOT
      </Button>
      <Button variant="danger" disabled>
        Cancel — ₹105 fee applies
      </Button>
    </div>
  ),
};

export const Pending: Story = {
  name: "In flight",
  parameters: {
    docs: {
      description: {
        story:
          "`isPending` disables the button and sets `aria-busy`, swapping in `pendingLabel` so the operator knows the tap landed and does not double-accept ORD-4471.",
      },
    },
  },
  render: () => (
    <div className={ROW}>
      <Button variant="primary" isPending pendingLabel="Accepting…">
        Accept order
      </Button>
      <Button variant="danger" isPending pendingLabel="Refunding ₹1,248.50…">
        Refund ₹1,248.50
      </Button>
    </div>
  ),
};

export const Block: Story = {
  name: "Full width",
  parameters: {
    docs: {
      description: {
        story:
          "`block` pins the button to its container — the partner card layout, one decision per card.",
      },
    },
  },
  render: () => (
    <div className="flex max-w-sm flex-col gap-2">
      <Button variant="primary" size="lg" block>
        Mark Masala Dosa ready
      </Button>
      <Button variant="outline" size="lg" block>
        Need 5 more minutes
      </Button>
    </div>
  ),
};

export const FocusVisible: Story = {
  name: "Focus-visible ring",
  parameters: {
    docs: {
      description: {
        story:
          "The ring is a 2px `--accent` outline at 2px offset, and it only appears for keyboard focus — a mouse tap leaves the button clean. The play function tabs onto the button so the ring is visible without touching the keyboard.",
      },
    },
  },
  render: () => (
    <div className={ROW}>
      <Button variant="primary">Accept order</Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const target = await canvas.findByRole("button", { name: "Accept order" });
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
          "Dark swaps `--accent` to its lighter indigo pair and `--crit` to its dark-ground pair. Nothing in the component changes — every colour is a token read.",
      },
    },
  },
  render: () => (
    <div className={STACK}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <div key={size} className="flex flex-col gap-2">
          <span className={CAPTION}>{size}</span>
          <div className={ROW}>
            <Button variant="primary" size={size}>
              Accept order
            </Button>
            <Button variant="outline" size={size}>
              Print KOT
            </Button>
            <Button variant="ghost" size={size}>
              View ORD-4471
            </Button>
            <Button variant="danger" size={size}>
              Cancel — ₹105 fee applies
            </Button>
            <Button variant="primary" size={size} disabled>
              Accept order
            </Button>
          </div>
        </div>
      ))}
    </div>
  ),
};
