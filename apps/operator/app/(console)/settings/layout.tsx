import type { Metadata } from "next";

export const metadata: Metadata = { title: "Platform settings" };

/**
 * Here only to name the browser tab. page.tsx is a client component, and a
 * client component cannot export metadata — so the title sits one file up and
 * the page renders exactly as it did.
 */
export default function SettingsLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
