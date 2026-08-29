import * as React from "react";
import { AuthSpinner } from "@repo/api-client";
import { SignInPanel } from "./sign-in-panel";

/**
 * The sign-in screen reads `?next=` to send the tablet back where it was, and
 * `useSearchParams` has to sit under a Suspense boundary or Next cannot
 * prerender this route at all.
 */
export default function LoginPage(): React.JSX.Element {
  return (
    <React.Suspense fallback={<AuthSpinner label="Opening sign in" />}>
      <SignInPanel />
    </React.Suspense>
  );
}
