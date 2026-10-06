import type { Metadata } from "next";

export const metadata: Metadata = {
  // The template is restated because a layout's own title stops the root's
  // template reaching the segments below it — without it /orders/716 was a bare
  // "Order #716", the one tab here that did not say which app it was.
  title: { template: "%s · Foodishi Restaurant", default: "Orders" },
};

/**
 * Here only to name the browser tab. page.tsx is a client component, and a
 * client component cannot export metadata — so the title sits one file up and
 * the page renders exactly as it did.
 */
export default function OrdersLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
