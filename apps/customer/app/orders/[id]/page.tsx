import * as React from "react";
import { RequireAccount } from "../../../components/require-account";
import { OrderTrackingView } from "../../../components/order-tracking-view";

/**
 * The id stays a string until the view parses it: the API owns what a valid
 * order id is, and a 404 carrying the server's own message beats a guess made
 * in the browser.
 */
export default async function OrderTrackingPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  return (
    <RequireAccount>
      <OrderTrackingView orderId={id} />
    </RequireAccount>
  );
}
