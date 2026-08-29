import * as React from "react";
import { RequireAccount } from "../../components/require-account";
import { PaymentHistoryView } from "../../components/payment-history-view";

export default function PaymentsPage(): React.JSX.Element {
  return (
    <RequireAccount>
      <PaymentHistoryView />
    </RequireAccount>
  );
}
