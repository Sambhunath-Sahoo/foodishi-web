"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { Button, Card, CardBody, ErrorBanner, Field, Input } from "@repo/ui";
import { useSession } from "../../lib/session";

/**
 * The recovery step: a signed-in identity that never got a Foodishi profile.
 *
 * Not an extra screen bolted on — it is the second half of sign-up, reached on
 * its own when the first half could not run both writes in one go. That happens
 * routinely: a Supabase project set to confirm email addresses returns no
 * session at sign-up, so POST /auth/link cannot be called until the person comes
 * back and signs in, which is exactly when they land here.
 *
 * The email is deliberately absent from this form. It comes from the verified
 * token and nowhere else.
 */
const MIN_NAME = 2;
const MIN_PHONE = 7;
const MIN_CITY = 2;

export function ProfileStep(): React.JSX.Element {
  const { completeProfile, isSigningIn } = useSession();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [city, setCity] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit =
    name.trim().length >= MIN_NAME &&
    phone.trim().length >= MIN_PHONE &&
    city.trim().length >= MIN_CITY &&
    !isSigningIn;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      await completeProfile({
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
      });
      // No navigation: the session lands in the provider, the status flips to
      // authenticated, and the parent renders the application form in its place.
    } catch (cause) {
      setError(toUserMessage(cause));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error !== null ? (
        <ErrorBanner title="Could not finish your account" message={error} />
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-medium text-ink">Almost there</p>
            <p className="text-[14px] leading-relaxed text-ink-2">
              Your sign-in works. Foodishi just needs a name to put on the
              application — this is asked once.
            </p>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
          >
            <Field label="Your name" htmlFor="link-name">
              <Input
                id="link-name"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Priya Nair"
                className="min-h-11"
              />
            </Field>

            <div className="flex flex-wrap gap-4">
              <div className="min-w-[180px] flex-1">
                <Field label="Phone" htmlFor="link-phone">
                  <Input
                    id="link-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+91 98765 43210"
                    className="min-h-11"
                  />
                </Field>
              </div>
              <div className="min-w-[180px] flex-1">
                <Field label="City" htmlFor="link-city">
                  <Input
                    id="link-city"
                    autoComplete="address-level2"
                    required
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Bengaluru"
                    className="min-h-11"
                  />
                </Field>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              block
              disabled={!canSubmit}
              isPending={isSigningIn}
              pendingLabel="Saving…"
            >
              Continue to the application
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
