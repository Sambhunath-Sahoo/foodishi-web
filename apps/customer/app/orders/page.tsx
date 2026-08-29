import * as React from "react";
import { RequireAccount } from "../../components/require-account";
import { OrderHistoryView } from "../../components/order-history-view";

export default function OrderHistoryPage(): React.JSX.Element {
  return (
    <RequireAccount>
      <OrderHistoryView />
    </RequireAccount>
  );
}
