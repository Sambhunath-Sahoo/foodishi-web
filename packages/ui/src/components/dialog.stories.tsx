import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { Button } from "./button";
import { Dialog } from "./dialog";
import { Field, Input } from "./input";

const meta = {
  title: "Primitives/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Reach for **Dialog** only when the next step must not be skipped: confirming",
          "something irreversible, or collecting the two or three fields an action cannot",
          "proceed without. It steals focus and blocks the page, which is exactly why it is",
          "expensive — a modal in the middle of a dinner rush is a stopped kitchen.",
          "",
          "Use something else for:",
          "",
          "- **telling the operator what happened** — that is a toast or an `ErrorBanner`;",
          "- **a form of any real length** — that is a page or a side sheet;",
          "- **an undoable action** — just do it, and offer undo. A confirmation the operator",
          "  taps forty times a shift has stopped being a confirmation.",
          "",
          "**State the consequence before the tap.** `description` is where the real number",
          "from the API goes — \"Cancelling now costs ₹105, taken from tomorrow's payout\" —",
          "using the policy frozen onto *that* order, not a generic warning. Never a bare",
          "\"Are you sure?\" followed by a surprise on the statement.",
          "",
          "The destructive confirm in the footer is an outlined `danger` button, never a",
          "filled one (DESIGN.md #5). Built on Radix Dialog, so focus trapping, `Escape`,",
          "scroll locking and the `aria-labelledby`/`aria-describedby` wiring are handled.",
          "",
          "Every story here opens from a trigger rather than starting open, so the docs page",
          "below stays readable.",
        ].join("\n"),
      },
    },
  },
  args: {
    open: false,
    onOpenChange: () => undefined,
    title: "Cancel this order?",
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Confirm: Story = {
  name: "Confirm — consequence stated",
  parameters: {
    docs: {
      description: {
        story:
          "The fee is in the description *and* in the button label, taken from the policy frozen onto ORD-4471. The operator can decide without reading a help page, and cannot claim the ₹105 was a surprise.",
      },
    },
  },
  render: function ConfirmStory() {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          Cancel ORD-4471
        </Button>
        <Dialog
          open={isOpen}
          onOpenChange={setIsOpen}
          title="Cancel this order?"
          description="Hyderabadi Dum has already started cooking, so the free window closed 3 minutes ago."
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Keep the order
              </Button>
              <Button variant="danger" onClick={() => setIsOpen(false)}>
                Cancel — ₹105 fee applies
              </Button>
            </>
          }
        >
          <p>
            <span className="font-mono tabular-nums">ORD-4471</span> · 2 × Mutton Dum
            Biryani, 1 × Mirchi Ka Salan, 1 × Paneer Tikka.
          </p>
          <p className="mt-2">
            <span className="font-mono tabular-nums">₹1,143.50</span> will be refunded
            to the original card in 3–5 working days. The{" "}
            <span className="font-mono tabular-nums">₹105.00</span> cancellation fee is
            taken from tomorrow&apos;s payout.
          </p>
        </Dialog>
      </>
    );
  },
};

export const StillFree: Story = {
  name: "Confirm — still free",
  parameters: {
    docs: {
      description: {
        story:
          "Same dialog, different number, because the same order is inside its free window. The copy is generated from the policy, not chosen by the screen — which is why the button reads \"free for 4 more min\" rather than \"Confirm\".",
      },
    },
  },
  render: function FreeStory() {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          Cancel ORD-4468
        </Button>
        <Dialog
          open={isOpen}
          onOpenChange={setIsOpen}
          title="Cancel this order?"
          description="Idli Factory has not started cooking yet."
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Keep the order
              </Button>
              <Button variant="danger" onClick={() => setIsOpen(false)}>
                Cancel — free for 4 more min
              </Button>
            </>
          }
        >
          <p>
            <span className="font-mono tabular-nums">ORD-4468</span> · 3 × Masala Dosa.
            The full <span className="font-mono tabular-nums">₹390.00</span> goes back
            to the original card.
          </p>
        </Dialog>
      </>
    );
  },
};

export const WithForm: Story = {
  name: "With a short form",
  parameters: {
    docs: {
      description: {
        story:
          "Two fields is about the ceiling. Anything longer belongs on a page, where the operator can leave it and come back. Note the confirm is still outlined — moving money is destructive.",
      },
    },
  },
  render: function FormStory() {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          Issue a refund
        </Button>
        <Dialog
          open={isOpen}
          onOpenChange={setIsOpen}
          title="Refund ORD-4471"
          description="Captured ₹1,248.50 on 19 Aug. A partial refund cannot be reversed."
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button variant="danger" onClick={() => setIsOpen(false)}>
                Refund ₹180.00
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field
              label="Amount"
              htmlFor="dialog-refund-amount"
              hint="Up to ₹1,248.50, the amount captured on this order."
            >
              <Input
                id="dialog-refund-amount"
                mono
                inputMode="decimal"
                defaultValue="180.00"
              />
            </Field>
            <Field label="Note for the partner" htmlFor="dialog-refund-note">
              <Input
                id="dialog-refund-note"
                defaultValue="Mirchi Ka Salan missing from the bag"
              />
            </Field>
          </div>
        </Dialog>
      </>
    );
  },
};

export const FormWithServerError: Story = {
  name: "With a server error",
  parameters: {
    docs: {
      description: {
        story:
          "The API refused the coupon and the dialog prints its sentence verbatim — \"Coupon has reached its usage limit\". The dialog stays open so the typed value is not thrown away.",
      },
    },
  },
  render: function ErrorStory() {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          Apply a coupon
        </Button>
        <Dialog
          open={isOpen}
          onOpenChange={setIsOpen}
          title="Apply a coupon to ORD-4471"
          description="The discount is recalculated against the ₹1,248.50 subtotal."
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button variant="primary">Apply coupon</Button>
            </>
          }
        >
          <Field label="Coupon code" htmlFor="dialog-coupon">
            <Input
              id="dialog-coupon"
              mono
              defaultValue="SOLDOUT"
              error="Coupon has reached its usage limit"
            />
          </Field>
        </Dialog>
      </>
    );
  },
};

export const TitleOnly: Story = {
  name: "Title only",
  parameters: {
    docs: {
      description: {
        story:
          "`description`, `children` and `footer` are each optional, so the chrome collapses to just the header. Rare — if there is nothing to say beyond the title, ask whether the dialog is needed at all.",
      },
    },
  },
  render: function TitleOnlyStory() {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
      <>
        <Button variant="ghost" onClick={() => setIsOpen(true)}>
          Show the bare dialog
        </Button>
        <Dialog
          open={isOpen}
          onOpenChange={setIsOpen}
          title="Crust & Coal is now accepting orders"
          footer={
            <Button variant="primary" onClick={() => setIsOpen(false)}>
              Got it
            </Button>
          }
        />
      </>
    );
  },
};

export const OpensAndTraps: Story = {
  name: "Opened by the play function",
  parameters: {
    docs: {
      description: {
        story:
          "The play function clicks the trigger, so the dialog is on screen without a manual tap. Radix moves focus inside and holds it there; `Escape` and a click on the overlay both close it. Keyboard focus inside the footer shows the standard 2px `--accent` ring.",
      },
    },
  },
  render: function AutoOpenStory() {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          Cancel ORD-4471
        </Button>
        <Dialog
          open={isOpen}
          onOpenChange={setIsOpen}
          title="Cancel this order?"
          description="Cancelling now costs ₹105, taken from tomorrow's payout."
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Keep the order
              </Button>
              <Button variant="danger" onClick={() => setIsOpen(false)}>
                Cancel — ₹105 fee applies
              </Button>
            </>
          }
        >
          <p>
            <span className="font-mono tabular-nums">ORD-4471</span> · Hyderabadi Dum ·{" "}
            <span className="font-mono tabular-nums">₹1,248.50</span>
          </p>
        </Dialog>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole("button", { name: "Cancel ORD-4471" });
    await userEvent.click(trigger);
  },
};

export const DisabledConfirm: Story = {
  name: "Disabled and in-flight footer",
  parameters: {
    docs: {
      description: {
        story:
          "A confirm that cannot run yet is disabled; a confirm already running uses `isPending` so the refund is not submitted twice. Both keep the outlined danger treatment.",
      },
    },
  },
  render: function DisabledStory() {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          Refund without a reason
        </Button>
        <Dialog
          open={isOpen}
          onOpenChange={setIsOpen}
          title="Refund ORD-4471"
          description="Choose a refund reason before this can be submitted."
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button variant="danger" disabled>
                Refund ₹1,248.50
              </Button>
              <Button variant="danger" isPending pendingLabel="Refunding…">
                Refund ₹1,248.50
              </Button>
            </>
          }
        />
      </>
    );
  },
};

export const DarkTheme: Story = {
  name: "Dark theme",
  globals: { theme: "dark" },
  parameters: {
    docs: {
      description: {
        story:
          "The overlay is `--ink` at 40%, which inverts with the theme — on a dark ground it is a light scrim rather than a black one, so the page behind stays legible enough to keep context.",
      },
    },
  },
  render: function DarkStory() {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          Cancel ORD-4471
        </Button>
        <Dialog
          open={isOpen}
          onOpenChange={setIsOpen}
          title="Cancel this order?"
          description="Cancelling now costs ₹105, taken from tomorrow's payout."
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Keep the order
              </Button>
              <Button variant="danger" onClick={() => setIsOpen(false)}>
                Cancel — ₹105 fee applies
              </Button>
            </>
          }
        >
          <p>
            <span className="font-mono tabular-nums">ORD-4471</span> · Hyderabadi Dum ·{" "}
            <span className="font-mono tabular-nums">₹1,248.50</span>
          </p>
        </Dialog>
      </>
    );
  },
};
