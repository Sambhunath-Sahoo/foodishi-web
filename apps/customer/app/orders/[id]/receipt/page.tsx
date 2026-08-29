import * as React from "react";
import { RequireAccount } from "../../../../components/require-account";
import { ReceiptView } from "../../../../components/receipt-view";

/**
 * The receipt for one order. Behind the account gate like the order itself —
 * a receipt names the customer and what they paid.
 */
export default async function ReceiptPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  return (
    <RequireAccount>
      <ReceiptView orderId={id} />
    </RequireAccount>
  );
}
