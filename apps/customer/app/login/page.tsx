import * as React from "react";
import { LoginView } from "../../components/login-view";
import { toSafeReturnPath } from "../../lib/next-path";

/**
 * `?next=` is read here rather than with useSearchParams so the form is in the
 * first HTML response instead of appearing after hydration. It is sanitised on
 * the way through: an absolute URL in that parameter would be an open redirect.
 */
export default async function LoginPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly next?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const { next } = await searchParams;
  const raw = Array.isArray(next) ? next[0] : next;
  return <LoginView returnPath={toSafeReturnPath(raw)} />;
}
