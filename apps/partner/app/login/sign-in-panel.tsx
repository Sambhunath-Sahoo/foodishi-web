"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toUserMessage } from "@repo/api-client";
import {
  Badge,
  Button,
  Card,
  CardBody,
  ErrorBanner,
  Field,
  Input,
  PageTitle,
  ThemeSwitcher,
} from "@repo/ui";
import { useSession } from "../../lib/session";
import { isFixtureSource, services } from "../../lib/services";
import { listSampleAccounts } from "../../lib/services/fixtures";

/** Where a signed-in tablet lands when /login was opened directly. */
const DEFAULT_DESTINATION = "/";

/**
 * `next` arrives from the URL, so it is untrusted input. Only a same-site path
 * is ever followed — "//evil.example" and "https://evil.example" are not paths
 * this app can navigate to, they are somebody else's site.
 */
function safeDestination(next: string | null): string {
  if (next === null || !next.startsWith("/") || next.startsWith("//")) {
    return DEFAULT_DESTINATION;
  }
  return next;
}

/**
 * The seeded accounts, with what each one is — so a reviewer can open the
 * Manager console, then the Staff console, and see that they are different
 * products rather than the same screens with buttons missing.
 *
 * Only rendered on the fixture source and only outside production. There is no
 * equivalent for the API: those are real credentials and this screen has no
 * business knowing any of them.
 */
function SampleAccounts({
  onPick,
}: {
  readonly onPick: (email: string, password: string) => void;
}): React.JSX.Element | null {
  // Read after mount, never during render. This route is prerendered, and the
  // seed is merged with whatever this browser has changed — a renamed account
  // would be one string on the server and another on the client, which is a
  // hydration mismatch for a sign-in hint nobody needs before paint.
  const [accounts, setAccounts] = React.useState<
    ReturnType<typeof listSampleAccounts>
  >([]);

  React.useEffect(() => {
    if (isFixtureSource) setAccounts(listSampleAccounts());
  }, []);

  if (!isFixtureSource || process.env.NODE_ENV === "production") return null;
  if (accounts.length === 0) return null;

  return (
    <Card>
      <CardBody className="flex flex-col gap-2">
        <p className="text-[13px] text-ink-3">
          Sample accounts — tap one to fill both fields. Manager and Staff see
          genuinely different consoles.
        </p>
        <ul className="flex flex-col gap-1.5">
          {accounts.map((account) => (
            <li key={account.id}>
              <button
                type="button"
                onClick={() => onPick(account.email, account.password)}
                className="flex w-full items-center justify-between gap-3 rounded-card border border-line px-3 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] text-ink">
                    {account.name}
                  </span>
                  <span className="block truncate text-[12px] text-ink-3">
                    {account.summary}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  {account.roleLabels.length === 0 ? (
                    <Badge tone="mute">No access</Badge>
                  ) : (
                    account.roleLabels.map((label) => (
                      <Badge key={label} tone={label === "Manager" ? "accent" : "mute"}>
                        {label}
                      </Badge>
                    ))
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

export function SignInPanel(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = safeDestination(searchParams.get("next"));

  const { signIn, status, isSigningIn } = useSession();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // A tablet that is already signed in has no business on this screen.
  //
  // An account with no Foodishi profile goes to /apply instead of `destination`:
  // every other screen needs a profile, so sending it onward would bounce it
  // straight back here. /apply is the one screen that can finish it.
  React.useEffect(() => {
    if (status === "authenticated") router.replace(destination);
    if (status === "unlinked") router.replace("/apply");
  }, [status, router, destination]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    try {
      await signIn(email.trim(), password);
      // Navigation happens in the effect above, once the session has landed:
      // going straight to the dashboard would race the membership read.
    } catch (cause) {
      // The source writes its refusals for humans, so they go through verbatim.
      setError(toUserMessage(cause));
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col justify-center gap-5 px-5 py-10">
      {/* Reachable before sign-in too: a tablet is often mounted in a dark
          corner, and making somebody sign in on a bright page first defeats the
          point of having the setting. */}
      <div className="flex justify-end">
        <ThemeSwitcher />
      </div>

      <PageTitle subtitle="Sign in to open your restaurant — the order queue, the menu and the day's takings.">
        Foodishi Restaurant
      </PageTitle>

      {error !== null ? <ErrorBanner title="Could not sign in" message={error} /> : null}

      <Card>
        <CardBody>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@restaurant.example"
                className="min-h-11"
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-11"
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              block
              isPending={isSigningIn}
              pendingLabel="Signing in…"
            >
              Sign in
            </Button>
          </form>
        </CardBody>
      </Card>

      <SampleAccounts
        onPick={(nextEmail, nextPassword) => {
          setEmail(nextEmail);
          setPassword(nextPassword);
        }}
      />

      {/* The one door out of this screen. A restaurateur who has never been
          given credentials has no business guessing at this form, and without
          this line the only way to find /apply is to be told the URL. */}
      <p className="text-center text-[13px] text-ink-3">
        Not on Foodishi yet?{" "}
        <Link
          href="/apply"
          className="text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Put your restaurant on Foodishi
        </Link>
      </p>

      <p className="text-center text-[12px] text-ink-3">
        Reading {services.sourceName === "fixtures" ? "bundled sample data" : "the Foodishi API"}.
      </p>
    </div>
  );
}
