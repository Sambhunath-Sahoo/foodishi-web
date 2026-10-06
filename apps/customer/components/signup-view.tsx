"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@repo/ui";
import { AuthSpinner } from "@repo/api-client";
import { useSignIn } from "../lib/use-sign-in";
import { useAccount } from "../lib/use-account";
import { AuthLayout, AuthLink } from "./auth-layout";
import { QueryError } from "./data-states";
import { ProfileLinkForm } from "./profile-link-form";
import { toLoginHref } from "../lib/next-path";
import { FIELD_TAP_TARGET } from "../lib/tap-targets";

/**
 * A brand-new customer, in two steps that are both real.
 *
 *  1. supabase-js `signUp` mints the identity and the ES256 session.
 *  2. POST /auth/link joins it to a `public.users` profile, matching on the
 *     address in the verified token. Until that lands GET /me answers 404 and
 *     names /auth/link, so there is no way to skip it and no reason to.
 *
 * If the project is set to confirm addresses, step 1 returns no session; the
 * screen says so rather than dropping the visitor into a form that would 401.
 */
const MIN_PASSWORD_LENGTH = 6;

type Stage = "credentials" | "confirm-email" | "link-profile";

export function SignupView({
  /** Already sanitised by the page: a same-site path, never an absolute URL. */
  returnPath,
}: {
  readonly returnPath: string;
}): React.JSX.Element {
  const router = useRouter();
  const { status, signUp } = useSignIn();
  // useAccount already resolves the profile half for whichever source is on.
  const { profileStatus, email: accountEmail } = useAccount();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [stage, setStage] = React.useState<Stage>("credentials");
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  const onLinked = React.useCallback(() => {
    router.replace(returnPath);
  }, [returnPath, router]);

  /**
   * Someone who is already signed in does not need step 1. Fully linked, they
   * are sent on their way; unlinked, they drop straight into step 2 — which is
   * also how a half-finished signup recovers after a reload.
   */
  React.useEffect(() => {
    if (status !== "authenticated") return;
    if (profileStatus === "ready") {
      router.replace(returnPath);
      return;
    }
    if (profileStatus === "unlinked") setStage("link-profile");
  }, [status, profileStatus, returnPath, router]);

  // A session that is already linked is on its way out of this screen; an
  // unlinked one drops into step 2 below. Everyone else gets the form in the
  // first HTML response rather than after hydration.
  if (status === "authenticated" && profileStatus !== "unlinked") {
    return <AuthSpinner label="Loading your account" />;
  }

  if (stage === "link-profile") {
    return (
      <AuthLayout
        title="Almost there"
        subtitle="Your account exists. This links it to a Foodishi profile."
        footer={
          <>
            Wrong account?{" "}
            <AuthLink href={toLoginHref(returnPath)}>Sign in as someone else</AuthLink>
          </>
        }
      >
        <ProfileLinkForm
          email={accountEmail ?? email}
          submitLabel="Create my profile"
          onLinked={onLinked}
        />
      </AuthLayout>
    );
  }

  if (stage === "confirm-email") {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle="This project confirms addresses before the first sign-in."
        footer={
          <>
            Confirmed already?{" "}
            <AuthLink href={toLoginHref(returnPath)}>Sign in</AuthLink>
          </>
        }
      >
        <p className="text-[13px] text-ink-2">
          We sent a confirmation link to{" "}
          <span className="font-mono text-ink">{email}</span>. Open it, then
          sign in — you will be asked for your name, phone and city once, and
          that is your Foodishi profile.
        </p>
      </AuthLayout>
    );
  }

  const canSubmit =
    email.trim() !== "" && password.length >= MIN_PASSWORD_LENGTH && !isPending;

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    if (!canSubmit) return;

    setIsPending(true);
    setError(null);

    void (async () => {
      try {
        const result = await signUp(email, password);
        setStage(result.needsEmailConfirmation ? "confirm-email" : "link-profile");
      } catch (signUpError) {
        setError(signUpError);
      } finally {
        setIsPending(false);
      }
    })();
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Two steps: your email and a password, then where we deliver."
      footer={
        <>
          Already have one?{" "}
          <AuthLink href={toLoginHref(returnPath)}>Sign in</AuthLink>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Email" htmlFor="signup-email">
          <Input
            className={FIELD_TAP_TARGET}
            id="signup-email"
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

        <Field
          label="Password"
          htmlFor="signup-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        >
          <Input
            className={FIELD_TAP_TARGET}
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>

        {error !== null ? (
          <QueryError title="Could not create your account" error={error} />
        ) : null}

        <Button
          type="submit"
          size="lg"
          block
          className="sm:w-full"
          disabled={!canSubmit}
          isPending={isPending}
          pendingLabel="Creating your account…"
        >
          Continue
        </Button>
      </form>
    </AuthLayout>
  );
}
