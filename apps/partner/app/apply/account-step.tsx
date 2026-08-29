"use client";

import * as React from "react";
import Link from "next/link";
import { toUserMessage } from "@repo/api-client";
import { Button, Card, CardBody, ErrorBanner, Field, Input } from "@repo/ui";
import { useSession } from "../../lib/session";
import { StepLabel } from "./step-label";

/**
 * Step one: an account, because an application has to belong to somebody.
 *
 * Five fields and not two. The three beyond email and password — name, phone,
 * city — are what `public.users` requires, and collecting them here rather than
 * on a second screen is deliberate: the API creates the identity and the profile
 * in two calls (`signUp` then POST /auth/link), and an applicant who closed the
 * tab between them would own an account with no profile and get a 404 naming an
 * endpoint on their next visit. One form, both calls, no half state to recover.
 *
 * The phone is the restaurant's contact for the operator reviewing this, so it
 * is not optional here even though nothing on this screen sends an SMS.
 */

/** Supabase's own floor. Stated so the refusal arrives before the round trip. */
const PASSWORD_MIN = 8;

interface AccountForm {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly city: string;
  readonly password: string;
}

const EMPTY: AccountForm = {
  name: "",
  email: "",
  phone: "",
  city: "",
  password: "",
};

export function AccountStep({
  onNeedsEmailConfirmation,
}: {
  /**
   * The project confirms addresses before the first sign-in, so there is no
   * session to continue with. The parent shows the inbox notice — this step
   * cannot, because it would then own two screens.
   */
  readonly onNeedsEmailConfirmation: () => void;
}): React.JSX.Element {
  const { signUp, isSigningIn } = useSession();
  const [form, setForm] = React.useState<AccountForm>(EMPTY);
  const [error, setError] = React.useState<string | null>(null);

  function set<K extends keyof AccountForm>(key: K, value: AccountForm[K]): void {
    // A new object rather than a mutation, so React sees the change.
    setForm((current) => ({ ...current, [key]: value }));
  }

  const canSubmit =
    form.name.trim().length >= 2 &&
    form.email.trim() !== "" &&
    form.phone.trim().length >= 7 &&
    form.city.trim().length >= 2 &&
    form.password.length >= PASSWORD_MIN &&
    !isSigningIn;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      const signedIn = await signUp({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
      });
      // Nothing to navigate to on success: the session lands in the provider and
      // the parent's own state moves to the next step. This branch is the one
      // where it will not.
      if (!signedIn) onNeedsEmailConfirmation();
    } catch (cause) {
      // Both sources write their refusals for humans, so they go through
      // verbatim — "that address already belongs to an account" is the whole
      // instruction.
      setError(toUserMessage(cause));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error !== null ? (
        <ErrorBanner title="Could not create your account" message={error} />
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-4">
          {/* Named, because pressing Continue here does NOT apply for anything
              — it makes the account the application will belong to, and
              somebody who thinks otherwise stops at the next screen believing
              they are done. */}
          <StepLabel step={1} of={2}>
            Your account
          </StepLabel>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
          >
            <Field label="Your name" htmlFor="apply-name">
              <Input
                id="apply-name"
                name="name"
                autoComplete="name"
                required
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="Priya Nair"
                className="min-h-11"
              />
            </Field>

            <Field
              label="Email"
              htmlFor="apply-email"
              hint="This is how Foodishi answers your application, and how you sign in."
            >
              <Input
                id="apply-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={form.email}
                onChange={(event) => set("email", event.target.value)}
                placeholder="you@restaurant.example"
                className="min-h-11"
              />
            </Field>

            <div className="flex flex-wrap gap-4">
              <div className="min-w-[180px] flex-1">
                <Field label="Phone" htmlFor="apply-phone">
                  <Input
                    id="apply-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    value={form.phone}
                    onChange={(event) => set("phone", event.target.value)}
                    placeholder="+91 98765 43210"
                    className="min-h-11"
                  />
                </Field>
              </div>
              <div className="min-w-[180px] flex-1">
                <Field label="City" htmlFor="apply-city">
                  <Input
                    id="apply-city"
                    name="city"
                    autoComplete="address-level2"
                    required
                    value={form.city}
                    onChange={(event) => set("city", event.target.value)}
                    placeholder="Bengaluru"
                    className="min-h-11"
                  />
                </Field>
              </div>
            </div>

            <Field
              label="Password"
              htmlFor="apply-password"
              hint={`At least ${PASSWORD_MIN} characters.`}
            >
              <Input
                id="apply-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN}
                required
                value={form.password}
                onChange={(event) => set("password", event.target.value)}
                className="min-h-11"
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              block
              disabled={!canSubmit}
              isPending={isSigningIn}
              pendingLabel="Creating your account…"
            >
              Continue
            </Button>
          </form>
        </CardBody>
      </Card>

      <p className="text-center text-[13px] text-ink-3">
        Already run a restaurant on Foodishi?{" "}
        <Link
          href="/login"
          className="text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
