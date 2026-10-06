import type { Metadata } from "next";
import * as React from "react";
import { AuthSpinner } from "@repo/api-client";
import { ApplyView } from "./apply-view";

export const metadata: Metadata = { title: "Apply to join" };

/**
 * Where a restaurant asks to join Foodishi.
 *
 * The one screen in this console written for somebody who does not work here
 * yet, which is why `app/_components/app-shell.tsx` lets it render without a
 * session. Everything else in the app assumes a kitchen; this is the route that
 * exists because there is not one.
 *
 * Suspense because ApplyView reads `?next=` through `useSearchParams`, and
 * without a boundary Next cannot prerender this route at all — the same reason
 * /login has one.
 */
export default function ApplyPage(): React.JSX.Element {
  return (
    <React.Suspense fallback={<AuthSpinner label="Opening the application" />}>
      <ApplyView />
    </React.Suspense>
  );
}
