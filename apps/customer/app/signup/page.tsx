import * as React from "react";
import { SignupView } from "../../components/signup-view";
import { toSafeReturnPath } from "../../lib/next-path";

export default async function SignupPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly next?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const { next } = await searchParams;
  const raw = Array.isArray(next) ? next[0] : next;
  return <SignupView returnPath={toSafeReturnPath(raw)} />;
}
