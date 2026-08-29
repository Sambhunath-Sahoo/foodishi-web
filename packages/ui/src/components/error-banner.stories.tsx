import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { ErrorBanner } from "./error-banner";

const meta = {
  title: "Domain/ErrorBanner",
  component: ErrorBanner,
  parameters: {
    docs: {
      description: {
        component:
          "Surface the server's reason (DESIGN.md copy rules). The API writes " +
          "its failures for humans, with the real distance, the real minimum " +
          "and the real fee — show that string verbatim, never \"Something " +
          "went wrong\".",
      },
    },
  },
  argTypes: {
    tone: { control: { type: "inline-radio" }, options: ["crit", "warn"] },
  },
} satisfies Meta<typeof ErrorBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The delivery radius check, in the API's own words and numbers. */
export const OutsideTheDeliveryRadius: Story = {
  args: {
    title: "Tandoori Nights cannot deliver here",
    message:
      "Address is 18.4 km away; this restaurant delivers up to 12 km",
    tone: "crit",
    action: (
      <Button variant="outline" size="sm">
        Change address
      </Button>
    ),
  },
};

/** The coupon rule, quoted rather than flattened into "Invalid coupon". */
export const CouponMinimumNotMet: Story = {
  args: {
    message: "Order must be at least ₹599 to use this coupon",
    tone: "crit",
  },
};

/** A coupon that exists but has nothing left. */
export const CouponExhausted: Story = {
  args: {
    title: "SOLDOUT could not be applied",
    message: "Coupon SOLDOUT has reached its limit of 200 redemptions",
    tone: "crit",
  },
};

/** Not yet a failure — a warning the operator must not act against. */
export const PaymentStillConfirming: Story = {
  args: {
    title: "ORD-4471 payment is still confirming",
    message:
      "Provider has not settled pay_Qk18ZrM2v after 92 seconds; do not re-charge the customer",
    tone: "warn",
    action: (
      <Button variant="ghost" size="sm">
        Recheck status
      </Button>
    ),
  },
};

/** A destructive recovery path stays outlined, never a filled red block. */
export const RefundFailedWithRetry: Story = {
  args: {
    title: "Refund for ORD-4459 failed",
    message:
      "Refund of ₹438.00 was declined by the provider: source payment is older than 180 days",
    tone: "crit",
    action: (
      <Button variant="danger" size="sm">
        Retry refund — ₹438.00
      </Button>
    ),
  },
};
