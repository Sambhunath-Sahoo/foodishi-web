"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthSpinner, toUserMessage } from "@repo/api-client";
import {
  Button,
  Card,
  CardBody,
  ErrorBanner,
  Field,
  Input,
  PageTitle,
  ThemeSwitcher,
} from "@repo/ui";
import { useOperatorSession } from "../../components/session-provider";

/** Where a successful sign-in lands when nothing asked for somewhere else. */
const DEFAULT_DESTINATION = "/";

/**
 * `?next=` comes off the URL, so it is untrusted. Only a same-origin absolute
 * path is honoured — `//evil.example` and `https://…` are dropped rather than
 * turned into an open redirect out of the console.
 */
function toSafeDestination(next: string | null): string {
  if (next === null || next === "") return DEFAULT_DESTINATION;
  if (!next.startsWith("/") || next.startsWith("//")) return DEFAULT_DESTINATION;
  return next;
}

function LoginForm(): React.JSX.Element {
  const { signIn, status } = useOperatorSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = toSafeDestination(searchParams.get("next"));

  const [email, setEmail] = React.useState("");
  const [passphrase, setPassphrase] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Someone who is already signed in has no business on this screen — arriving
  // here with a live session (a bookmark, a back button) goes straight through.
  React.useEffect(() => {
    if (status === "signed-in") router.replace(destination);
  }, [status, destination, router]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setIsSubmitting(true);
      setError(null);
      try {
        await signIn(email, passphrase);
        router.replace(destination);
      } catch (caught) {
        // The refusal is shown exactly as written: it names what to do next,
        // and rewriting it as "sign in failed" would throw that away.
        setError(toUserMessage(caught));
        setIsSubmitting(false);
      }
    },
    [signIn, email, passphrase, router, destination],
  );

  if (status === "loading") return <AuthSpinner />;
  if (status === "signed-in") return <AuthSpinner label="Opening the console" />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-4 py-10">
      <div className="flex flex-col gap-1">
        {/* On the sign-in screen too: the theme is a comfort setting, and making
            someone sign in on a bright page first defeats the point. */}
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[11px] font-semibold tracking-widest uppercase text-ink-4">
            Foodishi Operations
          </span>
          <ThemeSwitcher compact />
        </div>
        <PageTitle subtitle="This console is internal. Sign in with your Foodishi operations account to continue.">
          Sign in
        </PageTitle>
      </div>

      <Card>
        <CardBody>
          <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
            {error !== null ? (
              <ErrorBanner title="Sign in failed" message={error} />
            ) : null}

            <Field label="Email" htmlFor="login-email">
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                autoFocus
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ops.admin@foodishi.internal"
              />
            </Field>

            <Field label="Passphrase" htmlFor="login-passphrase">
              <Input
                id="login-passphrase"
                name="passphrase"
                type="password"
                autoComplete="current-password"
                required
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
              />
            </Field>

            <Button
              type="submit"
              block
              isPending={isSubmitting}
              pendingLabel="Signing in…"
            >
              Sign in
            </Button>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}

/**
 * useSearchParams needs a Suspense boundary or the route cannot be prerendered
 * at build time.
 */
export default function LoginPage(): React.JSX.Element {
  return (
    <React.Suspense fallback={<AuthSpinner label="Loading sign in" />}>
      <LoginForm />
    </React.Suspense>
  );
}
