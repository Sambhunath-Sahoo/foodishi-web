import type { Metadata } from "next";
import * as React from "react";
import { RequireAccount } from "../../components/require-account";
import { PaymentHistoryView } from "../../components/payment-history-view";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage(): React.JSX.Element {
  return (
    <RequireAccount>
      <PaymentHistoryView />
    </RequireAccount>
  );
}
