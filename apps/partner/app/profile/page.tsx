"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PageTitle,
  Thumb,
} from "@repo/ui";
import { ActionError } from "../_components/states";
import { ROLE_LABELS } from "../../lib/permissions";
import { useChangeMyPassword, useUpdateMyProfile } from "../../lib/queries/profile";
import { useSession } from "../../lib/session";
import { isFixtureSource } from "../../lib/services";
import type { Profile } from "../../lib/types";

const NAME_MIN = 2;
const PASSWORD_MIN = 8;

interface ProfileForm {
  readonly name: string;
  readonly phone: string;
  readonly city: string;
  readonly avatarUrl: string;
}

function toForm(profile: Profile): ProfileForm {
  return {
    name: profile.name,
    phone: profile.phone,
    city: profile.city,
    avatarUrl: profile.avatar_url ?? "",
  };
}

/**
 * Your own details.
 *
 * Deliberately short. Everything a person can change about themselves and
 * nothing they cannot — the email is shown and locked because it is the handle a
 * manager used to grant them access, and letting somebody edit it here would
 * silently detach them from the restaurant they work in.
 */
function DetailsCard({ profile }: { readonly profile: Profile }): React.JSX.Element {
  const saved = React.useMemo(() => toForm(profile), [profile]);
  const [form, setForm] = React.useState(saved);
  const save = useUpdateMyProfile();

  // Re-seeded when the session's answer changes, so the fields never keep a
  // stale edit after a save.
  React.useEffect(() => {
    setForm(saved);
  }, [saved]);

  function set<TField extends keyof ProfileForm>(field: TField, value: string): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const isDirty =
    form.name.trim() !== saved.name ||
    form.phone.trim() !== saved.phone ||
    form.city.trim() !== saved.city ||
    form.avatarUrl.trim() !== saved.avatarUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your details</CardTitle>
      </CardHeader>
      <CardBody>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate({
              name: form.name.trim(),
              phone: form.phone.trim(),
              city: form.city.trim(),
              avatar_url: form.avatarUrl.trim() === "" ? null : form.avatarUrl.trim(),
            });
          }}
        >
          <div className="flex flex-wrap items-end gap-4">
            <Thumb
              src={form.avatarUrl === "" ? null : form.avatarUrl}
              name={form.name === "" ? profile.email : form.name}
              size={56}
              shape="circle"
              // Thumb's own initials are ink-4, 2.4:1 on light; see account-menu.
              className="border border-line text-ink-2!"
            />
            <div className="min-w-[200px] flex-1">
              <Field label="Your name" htmlFor="profile-name">
                <Input
                  id="profile-name"
                  required
                  minLength={NAME_MIN}
                  value={form.name}
                  onChange={(event) => set("name", event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
          </div>

          {/* Shown as text, not as a greyed-out box: a disabled input looks
              like something that will unlock, and this never does. */}
          <div className="flex flex-col gap-1.5">
            <span className="font-sans text-[13px] font-medium text-ink-2">Email</span>
            <span className="font-mono text-[15px] text-ink">{profile.email}</span>
            <span className="text-[13px] text-ink-3">
              The address a manager used to give you access, so it is not yours to
              change here. Ask them if it is wrong.
            </span>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="min-w-[170px] flex-1">
              <Field label="Phone" htmlFor="profile-phone">
                <Input
                  id="profile-phone"
                  type="tel"
                  mono
                  value={form.phone}
                  onChange={(event) => set("phone", event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
            <div className="min-w-[170px] flex-1">
              <Field label="City" htmlFor="profile-city">
                <Input
                  id="profile-city"
                  value={form.city}
                  onChange={(event) => set("city", event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
          </div>

          {/* PATCH /me does not take avatar_url (lib/services/api/identity.ts
              drops it), so on the live API a pasted link used to mark the form
              dirty, say "Saved." and then vanish. There, it is one muted line
              and no input: a disabled field reads as a control that is broken. */}
          {isFixtureSource ? (
            <Field
              label="Photo URL"
              htmlFor="profile-avatar"
              hint="Optional. There is no upload yet, so a hosted link is the only way to set one."
            >
              <Input
                id="profile-avatar"
                type="url"
                mono
                value={form.avatarUrl}
                placeholder="https://…"
                onChange={(event) => set("avatarUrl", event.target.value)}
                className="min-h-11"
              />
            </Field>
          ) : (
            <p className="text-[14px] text-ink-3">
              <span className="font-medium text-ink-2">Photo</span> — your Foodishi
              profile does not store one yet.
            </p>
          )}

          {save.error !== null ? <ActionError error={save.error} /> : null}

          {save.isSuccess && !isDirty ? (
            <p className="text-[13px] text-ok">Saved.</p>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="submit"
              className="min-h-11"
              disabled={!isDirty}
              isPending={save.isPending}
              pendingLabel="Saving…"
            >
              Save details
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

/**
 * Changing your own password.
 *
 * The current password is required and checked. A console that could set a new
 * password from an unlocked tablet is a console that hands the restaurant to
 * whoever walks past it while somebody is on a break.
 *
 * It deliberately does NOT sign you out. Being ejected from the tablet
 * mid-service because you tidied up your password would be a worse outcome than
 * the session it ends.
 */
function PasswordCard(): React.JSX.Element {
  return isFixtureSource ? <PasswordForm /> : <PasswordUnavailable />;
}

/**
 * The live API has no password change or reset endpoint, so there is nothing to
 * fill in: one muted line saying who can do it, instead of three disabled
 * boxes and a pointer to a sign-in reset the sign-in screen does not offer.
 */
function PasswordUnavailable(): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
      </CardHeader>
      <CardBody>
        <p className="text-[14px] text-ink-3">
          Ask Foodishi support to reset your password.
        </p>
      </CardBody>
    </Card>
  );
}

function PasswordForm(): React.JSX.Element {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const change = useChangeMyPassword();

  // Checked here rather than sent: the two boxes exist to catch a typo, and the
  // source has no way to know which of them was the one that was wrong.
  const mismatch = confirm !== "" && next !== confirm;
  const canSubmit = current !== "" && next.length >= PASSWORD_MIN && next === confirm;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
      </CardHeader>
      <CardBody>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            change.mutate(
              { currentPassword: current, newPassword: next },
              {
                onSuccess: () => {
                  setCurrent("");
                  setNext("");
                  setConfirm("");
                },
              },
            );
          }}
        >
          <Field label="Your current password" htmlFor="password-current">
            <Input
              id="password-current"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              className="min-h-11"
            />
          </Field>

          <div className="flex flex-wrap gap-4">
            <div className="min-w-[200px] flex-1">
              <Field
                label="New password"
                htmlFor="password-new"
                hint={`At least ${PASSWORD_MIN} characters.`}
              >
                <Input
                  id="password-new"
                      type="password"
                  autoComplete="new-password"
                  required
                  minLength={PASSWORD_MIN}
                  value={next}
                  onChange={(event) => setNext(event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
            <div className="min-w-[200px] flex-1">
              <Field label="Type it again" htmlFor="password-confirm">
                <Input
                  id="password-confirm"
                      type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
          </div>

          {mismatch ? (
            <p role="alert" className="text-[13px] text-crit">
              Those two do not match.
            </p>
          ) : null}

          {change.error !== null ? <ActionError error={change.error} /> : null}

          {change.isSuccess ? (
            <p className="text-[13px] text-ok">
              Password changed. You are still signed in on this tablet — nobody is
              signed out mid-service for changing a password.
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="submit"
              className="min-h-11"
              disabled={!canSubmit}
              isPending={change.isPending}
              pendingLabel="Changing…"
            >
              Change password
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

/**
 * Where this account works, and as what.
 *
 * Read-only by definition — a person cannot grant themselves access — but worth
 * showing: somebody who works two shifts in two restaurants can check which one
 * this tablet is about to act for, and a shift worker who has been told they now
 * have the manager's permissions can see whether it actually happened.
 */
function AccessCard(): React.JSX.Element {
  const { memberships } = useSession();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where you work</CardTitle>
        <span className="text-[13px] text-ink-3">
          {memberships.length === 1 ? "1 restaurant" : `${memberships.length} restaurants`}
        </span>
      </CardHeader>
      <CardBody className="flex flex-col gap-2">
        {memberships.length === 0 ? (
          <p className="text-[15px] text-ink-3">
            This account does not work at any restaurant yet.
          </p>
        ) : (
          <ul className="flex flex-col">
            {memberships.map((membership) => (
              <li
                key={membership.id}
                className="flex min-h-11 flex-wrap items-center gap-3 border-b border-line py-2 last:border-b-0"
              >
                <Thumb src={membership.image_url} name={membership.name} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] text-ink">
                    {membership.name}
                  </span>
                  <span className="block text-[12px] text-ink-3">{membership.city}</span>
                </span>
                <Badge tone={membership.role === "manager" ? "accent" : "mute"}>
                  {ROLE_LABELS[membership.role]}
                </Badge>
                {membership.is_active ? null : <Badge tone="crit">Closed</Badge>}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[12px] leading-snug text-ink-3">
          Only a manager at a restaurant can change what you may do there. If your
          access is wrong, ask them.
        </p>
      </CardBody>
    </Card>
  );
}

/**
 * The one screen in this console that is about the person rather than the
 * restaurant — so it is outside the KitchenGate, and works even for an account
 * that has just had its last membership revoked.
 */
export default function ProfilePage(): React.JSX.Element {
  const { profile } = useSession();

  return (
    <div className="flex flex-col gap-4">
      <PageTitle subtitle="Your own details and password. Nothing here changes the restaurant.">
        You
      </PageTitle>

      {profile === null ? (
        <p className="text-[15px] text-ink-3">Reading your account…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <DetailsCard profile={profile} />
          <PasswordCard />
          <AccessCard />
          <p className="text-[12px] leading-snug text-ink-3">
            {isFixtureSource
              ? "This console is running on bundled sample data, so your details and a password change are stored in this browser and nowhere else. Reset from the header to throw it away."
              : "Your name, phone and city save to your Foodishi profile."}
          </p>
        </div>
      )}
    </div>
  );
}
