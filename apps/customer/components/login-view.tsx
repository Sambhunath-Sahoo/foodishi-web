"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@repo/ui";
import { AuthSpinner } from "@repo/api-client";
import { useSignIn } from "../lib/use-sign-in";
import { AuthLayout, AuthLink } from "./auth-layout";
import { QueryError } from "./data-states";
import { toLoginHref } from "../lib/next-path";

/**
 * Real sign-in: supabase-js `signInWithPassword`, an ES256 access token, and
 * every API call after it carrying that token. There is no dev header any
 * more — the API rejects it.
 *
 * The `?next=` path is honoured so the cart survives the sign-in wall: someone
 * bounced here from /checkout lands back on /checkout with their cart intact,
 * because the cart never left localStorage and the redirect is a soft replace.
 */
export function LoginView({
  /** Already sanitised by the page: a same-site path, never an absolute URL. */
  returnPath,
}: {
  readonly returnPath: string;
}): React.JSX.Element {
  const router = useRouter();
  const { signIn, status } = useSignIn();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  // Already signed in — nobody should sit on a login form they do not need.
  React.useEffect(() => {
    if (status === "authenticated") router.replace(returnPath);
  }, [status, returnPath, router]);

  // `loading` still shows the form: it is the whole point of this page, and
  // the server has it in the first HTML response. Only a session that already
  // exists replaces it, and then only for as long as the redirect takes.
  if (status === "authenticated") return <AuthSpinner label="Taking you back" />;

  const canSubmit = email.trim() !== "" && password !== "" && !isPending;

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    if (!canSubmit) return;

    setIsPending(true);
    setError(null);

    void (async () => {
      try {
        await signIn(email, password);
        router.replace(returnPath);
      } catch (signInError) {
        // Supabase writes its own refusal — "Invalid login credentials" —
        // and that sentence is what appears, not a rewrite of it.
        setError(signInError);
        setIsPending(false);
      }
    })();
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Your addresses, your coupons and every order you have placed."
      footer={
        <>
          New here?{" "}
          <AuthLink href={toLoginHref(returnPath, "/signup")}>
            Create an account
          </AuthLink>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Email" htmlFor="login-email">
          <Input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field label="Password" htmlFor="login-password">
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>

        {error !== null ? (
          <QueryError title="Could not sign you in" error={error} />
        ) : null}

        <Button
          type="submit"
          size="lg"
          block
          disabled={!canSubmit}
          isPending={isPending}
          pendingLabel="Signing you in…"
        >
          Sign in
        </Button>
      </form>

    </AuthLayout>
  );
}

