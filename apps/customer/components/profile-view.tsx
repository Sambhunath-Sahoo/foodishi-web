"use client";

import * as React from "react";
import Link from "next/link";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PageTitle,
  ThemeSwitcher,
  Thumb,
} from "@repo/ui";
import { QueryError } from "./data-states";
import { SignOutButton } from "./sign-out-button";
import { FIELD_TAP_TARGET } from "../lib/tap-targets";
import { useSupport } from "../lib/support";
import { useFavorites } from "../lib/favorites";
import { useAccount } from "../lib/use-account";
import {
  PROFILE_LIMITS,
  hasProfileChanges,
  toProfileChanges,
  useUpdateProfile,
  validateProfileDraft,
  type ProfileDraft,
  type ProfileErrors,
} from "../lib/queries/profile";

/**
 * The account screen: the three things a kitchen and a rider need, and the one
 * thing they must not be able to change from here.
 *
 * The field shapes are ProfileLinkForm's on purpose — name, phone, city, in
 * that order, with the same hints. Someone who typed them during signup should
 * recognise the screen where they change them, and two forms over the same
 * three columns should not drift.
 */
export function ProfileView(): React.JSX.Element {
  const { displayName, email, phone, city, avatarUrl } = useAccount();
  const update = useUpdateProfile();
  const { openCount } = useSupport();
  const { favorites } = useFavorites();

  // No seeding effect: <RequireAccount> holds this screen behind
  // profileStatus === "ready", so the profile is already in hand on the first
  // render. An effect here would only re-open the door to clobbering what the
  // customer is halfway through typing.
  const saved: ProfileDraft = {
    name: displayName ?? "",
    phone: phone ?? "",
    city: city ?? "",
  };
  const [draft, setDraft] = React.useState<ProfileDraft>(saved);
  const [wasSubmitted, setWasSubmitted] = React.useState(false);

  const changes = toProfileChanges(saved, draft);
  const isDirty = hasProfileChanges(changes);
  const errors = validateProfileDraft(draft);
  const hasErrors = Object.keys(errors).length > 0;
  // Length complaints appear after the first attempt, not while the second
  // character of a name is still being typed.
  const shown: ProfileErrors = wasSubmitted ? errors : {};

  function edit(field: keyof ProfileDraft, value: string): void {
    // A new draft every keystroke — no field is mutated in place.
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    setWasSubmitted(true);
    if (!isDirty || hasErrors) return;
    update.mutate(changes);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageTitle subtitle="What the kitchen and the rider see">
        Your account
      </PageTitle>

      <Card className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Thumb
            src={avatarUrl}
            name={displayName ?? email ?? "You"}
            size={56}
            shape="circle"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {displayName ?? "Your name"}
            </p>
            <p className="truncate font-mono text-[12px] text-ink-3">
              {email ?? "No address on this session"}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardBody className="py-4">
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <Field label="Your name" htmlFor="profile-name">
              <Input
                id="profile-name"
                name="name"
                autoComplete="name"
                minLength={PROFILE_LIMITS.nameMin}
                maxLength={PROFILE_LIMITS.nameMax}
                value={draft.name}
                onChange={(event) => edit("name", event.target.value)}
                error={shown.name}
                required
                className={FIELD_TAP_TARGET}
              />
            </Field>

            <Field
              label="Phone"
              htmlFor="profile-phone"
              hint="The kitchen and the rider call this number."
            >
              <Input
                id="profile-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                mono
                minLength={PROFILE_LIMITS.phoneMin}
                maxLength={PROFILE_LIMITS.phoneMax}
                value={draft.phone}
                onChange={(event) => edit("phone", event.target.value)}
                error={shown.phone}
                required
                className={FIELD_TAP_TARGET}
              />
            </Field>

            <Field
              label="City"
              htmlFor="profile-city"
              hint="Where you order from most."
            >
              <Input
                id="profile-city"
                name="city"
                autoComplete="address-level2"
                minLength={PROFILE_LIMITS.cityMin}
                maxLength={PROFILE_LIMITS.cityMax}
                value={draft.city}
                onChange={(event) => edit("city", event.target.value)}
                error={shown.city}
                required
                className={FIELD_TAP_TARGET}
              />
            </Field>

            {/* Not an input, and deliberately not a <Field> either: a <label>
                may only point at a control, and this address is not one. It is
                what joins the Supabase identity to this profile, so changing it
                here would leave you signing in with one address and owning a
                profile under another. */}
            <div className="flex flex-col gap-1.5">
              <p className="font-sans text-[13px] font-medium text-ink-2">
                Sign-in email
              </p>
              <p className="rounded-card border border-line bg-surface-2 px-3 py-2.5 font-mono text-[13px] text-ink-2">
                {email ?? "—"}
              </p>
              <p className="text-[12px] text-ink-3">
                Fixed — it is the address your session is proved with.
              </p>
            </div>

            {update.isError ? (
              // A 409 here means the profile was removed mid-request; the
              // server writes which, so print it rather than paraphrase.
              <QueryError title="Could not save your details" error={update.error} />
            ) : null}

            <p aria-live="polite" className="text-[13px] text-ok">
              {update.isSuccess && !isDirty ? "Saved." : ""}
            </p>

            <Button
              type="submit"
              size="lg"
              block
              // `lg` keys its sm:w-auto off the browser, not the 480px column.
              className="sm:w-full"
              disabled={!isDirty}
              isPending={update.isPending}
              pendingLabel="Saving…"
            >
              {isDirty ? "Save changes" : "Nothing to save yet"}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Everything else</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="flex flex-col divide-y divide-line">
            <AccountLink
              href="/payments"
              label="Payments"
              detail="Every attempt, and the receipts"
            />
            <AccountLink
              href="/orders"
              label="Order history"
              detail="Reorder, or open a receipt"
            />
            <AccountLink
              href="/favorites"
              label="Favourites"
              detail={
                favorites.restaurants.length + favorites.items.length === 0
                  ? "Nothing saved yet"
                  : `${favorites.restaurants.length} kitchens · ${favorites.items.length} dishes`
              }
            />
            <AccountLink
              href="/support"
              label="Support"
              detail={
                openCount === 0
                  ? "Report a problem with an order"
                  : `${openCount} open ${openCount === 1 ? "ticket" : "tickets"}`
              }
            />
          </ul>
        </CardBody>
      </Card>

      {/* Moved here from the header, full-size: at 390px the header had no room
          for it, and three labelled 44px options are easier to hit than three
          22px icons ever were. The choice is stored on this device and shared
          by every Foodishi app on it. */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-2 py-4">
          {/* The switcher renders nothing until it has read localStorage, so
              the slot holds its height and the card does not jump. */}
          <div className="min-h-[50px]">
            <ThemeSwitcher className="flex w-full [&>button]:min-h-11 [&>button]:flex-1 [&>button]:justify-center" />
          </div>
          <p className="text-[12px] text-ink-3">
            System follows your phone’s own light or dark setting.
          </p>
        </CardBody>
      </Card>

      <SignOutButton />
    </div>
  );
}

/** One row of the account index. The whole row is the target, not the word. */
function AccountLink({
  href,
  label,
  detail,
}: {
  readonly href: string;
  readonly label: string;
  readonly detail: string;
}): React.JSX.Element {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-[52px] items-center justify-between gap-3 py-2 no-underline"
      >
        <span className="min-w-0">
          <span className="block text-[14px] font-medium text-ink">{label}</span>
          <span className="block truncate text-[12px] text-ink-3">{detail}</span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-ink-3">
          &rsaquo;
        </span>
      </Link>
    </li>
  );
}
