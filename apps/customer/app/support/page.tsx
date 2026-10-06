import type { Metadata } from "next";
import * as React from "react";
import { RequireAccount } from "../../components/require-account";
import { SupportView } from "../../components/support-view";

export const metadata: Metadata = { title: "Support" };

/**
 * Behind the account gate: every ticket topic here is about an order, and the
 * order picker reads GET /me/orders.
 */
export default function SupportPage(): React.JSX.Element {
  return (
    <RequireAccount>
      <SupportView />
    </RequireAccount>
  );
}
