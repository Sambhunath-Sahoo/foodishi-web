import type { Metadata } from "next";
import * as React from "react";
import { RequireAccount } from "../../components/require-account";
import { CheckoutView } from "../../components/checkout-view";

export const metadata: Metadata = { title: "Checkout" };

/**
 * The sign-in wall. Reaching it signed out is a soft replace to
 * /login?next=/checkout, so the cart — which lives in the browser, not the
 * session — is exactly where it was on the way back.
 */
export default function CheckoutPage(): React.JSX.Element {
  return (
    <RequireAccount>
      <CheckoutView />
    </RequireAccount>
  );
}
