import type { Metadata } from "next";
import * as React from "react";
import { DevCredentialsPage } from "@repo/ui";

export const metadata: Metadata = { title: "Sign-in credentials" };

/**
 * /creds — every seeded login, in one place.
 *
 * The same page in all three consoles on purpose: the account you need is
 * usually not the one for the app you are looking at. One implementation lives
 * in @repo/ui, and it renders a refusal in a production build.
 */
export default function CredsPage(): React.JSX.Element {
  return <DevCredentialsPage />;
}
