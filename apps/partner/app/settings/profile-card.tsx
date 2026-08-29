"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Thumb,
} from "@repo/ui";
import { useUpdateRestaurant } from "../../lib/queries/restaurant";
import type { RestaurantDetail, RestaurantPatch } from "../../lib/types";
import type { ReadyKitchen } from "../../lib/kitchen";

/** The API's own bounds, so a bad value is refused before it is a round trip. */
const NAME_MIN = 2;
const PHONE_MIN = 7;
const AREA_MIN = 2;
const ADDRESS_MIN = 4;
const PREP_MIN = 1;
const PREP_MAX = 240;
const PRICE_STEP = "0.01";

/**
 * The form's own shape: every field a string, because that is what an input
 * holds. Turning them back into the API's decimals and integers happens once,
 * in `toPatch`, rather than in eight onChange handlers.
 */
interface ProfileForm {
  readonly name: string;
  readonly phone: string;
  readonly area: string;
  readonly addressLine: string;
  readonly priceForTwo: string;
  readonly avgPrepMinutes: string;
  readonly description: string;
  readonly imageUrl: string;
}

function toForm(restaurant: RestaurantDetail): ProfileForm {
  return {
    name: restaurant.name,
    phone: restaurant.phone,
    area: restaurant.area,
    addressLine: restaurant.address_line,
    priceForTwo: restaurant.price_for_two,
    avgPrepMinutes: String(restaurant.avg_prep_minutes),
    description: restaurant.description ?? "",
    imageUrl: restaurant.image_url ?? "",
  };
}

/**
 * Only what actually changed. PATCH means "these fields", and sending the
 * untouched ones back would turn every save into a write of the whole row —
 * which is how two people editing one kitchen overwrite each other's work.
 *
 * The two nullable columns send null when emptied, because "no description" and
 * "a description of empty string" are different rows; every other field is
 * omitted rather than nulled, which the API rejects outright.
 */
function toPatch(next: ProfileForm, saved: ProfileForm): RestaurantPatch {
  return {
    ...(next.name !== saved.name ? { name: next.name } : {}),
    ...(next.phone !== saved.phone ? { phone: next.phone } : {}),
    ...(next.area !== saved.area ? { area: next.area } : {}),
    ...(next.addressLine !== saved.addressLine
      ? { address_line: next.addressLine }
      : {}),
    ...(next.priceForTwo !== saved.priceForTwo
      ? { price_for_two: next.priceForTwo }
      : {}),
    ...(next.avgPrepMinutes !== saved.avgPrepMinutes
      ? { avg_prep_minutes: Number(next.avgPrepMinutes) }
      : {}),
    ...(next.description !== saved.description
      ? { description: next.description === "" ? null : next.description }
      : {}),
    ...(next.imageUrl !== saved.imageUrl
      ? { image_url: next.imageUrl === "" ? null : next.imageUrl }
      : {}),
  };
}

/** Trimmed, because the API strips whitespace too and would report no change. */
function trimForm(form: ProfileForm): ProfileForm {
  return {
    name: form.name.trim(),
    phone: form.phone.trim(),
    area: form.area.trim(),
    addressLine: form.addressLine.trim(),
    priceForTwo: form.priceForTwo.trim(),
    avgPrepMinutes: form.avgPrepMinutes.trim(),
    description: form.description.trim(),
    imageUrl: form.imageUrl.trim(),
  };
}

/**
 * What a customer reads before ordering. Everything here is one PATCH, and the
 * bounds on the inputs are the API's own — the browser refuses a 300-minute
 * prep time before it is a request, and anything it lets through comes back as
 * the server's own sentence rather than "invalid".
 */
export function ProfileCard({
  kitchen,
  restaurant,
}: {
  readonly kitchen: ReadyKitchen;
  readonly restaurant: RestaurantDetail;
}): React.JSX.Element {
  const mutation = useUpdateRestaurant(kitchen);
  const canEditRestaurant = kitchen.can("restaurant.edit");

  const saved = React.useMemo(() => toForm(restaurant), [restaurant]);
  const [form, setForm] = React.useState(saved);

  // Re-seeded from the server's answer, so a save — or switching kitchen in the
  // picker — never leaves another restaurant's address in the fields.
  React.useEffect(() => {
    setForm(saved);
  }, [saved]);

  const patch = toPatch(trimForm(form), saved);
  const isDirty = Object.keys(patch).length > 0;

  function set<TField extends keyof ProfileForm>(
    field: TField,
    value: string,
  ): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <span className="font-mono text-[13px] text-ink-3">
          /{restaurant.slug}
        </span>
      </CardHeader>

      <CardBody>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(patch);
          }}
        >
          <div className="flex items-start gap-4">
            {/* Larger than the picker's 48px: this is the one screen where the
                cover is the subject rather than a way to tell rows apart. */}
            <Thumb src={form.imageUrl} name={restaurant.name} size={72} />
            <div className="min-w-0 flex-1">
              <Field
                label="Cover photo"
                htmlFor="profile-image-url"
                hint="A link to the photo, not an upload — there is no upload route for a cover yet. Clear the field to go back to the initials."
              >
                <Input
                  id="profile-image-url"
                  type="url"
                  value={form.imageUrl}
                  disabled={!canEditRestaurant}
                  placeholder="https://…"
                  onChange={(event) => set("imageUrl", event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
          </div>

          <Field label="Name" htmlFor="profile-name">
            <Input
              id="profile-name"
              required
              minLength={NAME_MIN}
              value={form.name}
              disabled={!canEditRestaurant}
              onChange={(event) => set("name", event.target.value)}
              className="min-h-11"
            />
          </Field>

          <Field
            label="Description"
            htmlFor="profile-description"
            hint="One or two lines, in the customer's words rather than the kitchen's."
          >
            <textarea
              id="profile-description"
              rows={3}
              value={form.description}
              disabled={!canEditRestaurant}
              onChange={(event) => set("description", event.target.value)}
              className="w-full rounded-card border border-line-2 bg-surface px-3 py-2 font-sans text-sm text-ink placeholder:text-ink-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-4"
            />
          </Field>

          <div className="flex flex-wrap gap-4">
            <div className="min-w-[180px] flex-1">
              <Field label="Phone" htmlFor="profile-phone">
                <Input
                  id="profile-phone"
                  type="tel"
                  mono
                  required
                  minLength={PHONE_MIN}
                  value={form.phone}
                  disabled={!canEditRestaurant}
                  onChange={(event) => set("phone", event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
            <div className="min-w-[180px] flex-1">
              <Field label="Area" htmlFor="profile-area">
                <Input
                  id="profile-area"
                  required
                  minLength={AREA_MIN}
                  value={form.area}
                  disabled={!canEditRestaurant}
                  onChange={(event) => set("area", event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
          </div>

          <Field
            label="Address"
            htmlFor="profile-address"
            hint={`${restaurant.city} and the map pin are set by Foodishi — ask them to move either one.`}
          >
            <Input
              id="profile-address"
              required
              minLength={ADDRESS_MIN}
              value={form.addressLine}
              disabled={!canEditRestaurant}
              onChange={(event) => set("addressLine", event.target.value)}
              className="min-h-11"
            />
          </Field>

          <div className="flex flex-wrap gap-4">
            <div className="min-w-[180px] flex-1">
              <Field
                label="Price for two"
                htmlFor="profile-price-for-two"
                hint="What a customer browsing sees as this kitchen's usual bill."
              >
                <Input
                  id="profile-price-for-two"
                  type="number"
                  mono
                  required
                  min={PRICE_STEP}
                  step={PRICE_STEP}
                  value={form.priceForTwo}
                  disabled={!canEditRestaurant}
                  onChange={(event) => set("priceForTwo", event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
            <div className="min-w-[180px] flex-1">
              <Field
                label="Usual prep time"
                htmlFor="profile-avg-prep-minutes"
                hint={`Minutes, ${PREP_MIN}–${PREP_MAX}. Every promised time on the queue is built from this.`}
              >
                <Input
                  id="profile-avg-prep-minutes"
                  type="number"
                  mono
                  required
                  min={PREP_MIN}
                  max={PREP_MAX}
                  step={1}
                  value={form.avgPrepMinutes}
                  disabled={!canEditRestaurant}
                  onChange={(event) => set("avgPrepMinutes", event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
          </div>

          {mutation.error !== null ? (
            <p role="alert" className="text-[13px] leading-snug text-crit">
              {toUserMessage(mutation.error)}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            {isDirty ? (
              <Button
                variant="ghost"
                className="min-h-11"
                disabled={mutation.isPending}
                onClick={() => setForm(saved)}
              >
                Discard changes
              </Button>
            ) : null}
            <Button
              type="submit"
              className="min-h-11"
              disabled={!canEditRestaurant || !isDirty}
              isPending={mutation.isPending}
              pendingLabel="Saving…"
            >
              Save profile
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
