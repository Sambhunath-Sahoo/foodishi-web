"use client";

import * as React from "react";
import { Button, Field, Input } from "@repo/ui";
import { linkProfile, useSession } from "@repo/api-client";
import { QueryError } from "./data-states";

/**
 * The second half of becoming a customer.
 *
 * Supabase proves the address; POST /auth/link joins it to a `public.users`
 * profile. There is no email field on purpose — the API takes the address from
 * the verified token, so typing one here could not claim someone else's row.
 *
 * Runs after a fresh signup, and again for any signed-in identity that reaches
 * a personal screen while GET /me still 404s.
 */
export function ProfileLinkForm({
  email,
  submitLabel = "Finish setting up",
  onLinked,
}: {
  readonly email: string | null;
  readonly submitLabel?: string;
  readonly onLinked: () => void;
}): React.JSX.Element {
  const { refreshProfile } = useSession();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [city, setCity] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  const canSubmit =
    name.trim() !== "" && phone.trim() !== "" && city.trim() !== "" && !isPending;

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    if (!canSubmit) return;

    setIsPending(true);
    setError(null);

    void (async () => {
      try {
        await linkProfile({
          name: name.trim(),
          phone: phone.trim(),
          city: city.trim(),
        });
        // The provider still holds the 404 from before the link; re-read /me
        // so every screen below sees the profile without a reload.
        await refreshProfile();
        onLinked();
      } catch (linkError) {
        setError(linkError);
      } finally {
        setIsPending(false);
      }
    })();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {email !== null ? (
        <p className="text-[13px] text-ink-3">
          Signed in as{" "}
          <span className="font-mono text-ink-2">{email}</span>. The API reads
          your address from the session, so there is nothing to type for it.
        </p>
      ) : null}

      <Field label="Your name" htmlFor="link-name">
        <Input
          id="link-name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Lakshmi Reddy"
          required
        />
      </Field>

      <Field
        label="Phone"
        htmlFor="link-phone"
        hint="The kitchen and the rider call this number."
      >
        <Input
          id="link-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          mono
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="9876500000"
          required
        />
      </Field>

      <Field label="City" htmlFor="link-city" hint="Where you order from most.">
        <Input
          id="link-city"
          name="city"
          autoComplete="address-level2"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Bengaluru"
          required
        />
      </Field>

      {error !== null ? (
        // 409 here means the account is deactivated or the address already
        // belongs to another profile — the server says which, verbatim.
        <QueryError title="Could not link your profile" error={error} />
      ) : null}

      <Button
        type="submit"
        size="lg"
        block
        disabled={!canSubmit}
        isPending={isPending}
        pendingLabel="Linking your profile…"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
