import type { Metadata } from "next";
import * as React from "react";
import { OrderDetailView } from "../../_components/order-detail-view";

/** The id is in the URL, so the tab can name the order without a fetch. */
export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order #${id}` };
}

/**
 * The id stays a string all the way to the URL it is interpolated into: the
 * API owns what a valid order id is, and a 404 with the server's own message
 * beats a client-side guess.
 */
export default async function OrderDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  return <OrderDetailView orderId={id} />;
}
