"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { Button, Card, CardBody, ErrorBanner, Field, Input } from "@repo/ui";
import { useSubmitApplication } from "../../lib/queries/applications";
import {
  EMPTY_FORM,
  LIMITS,
  SLUG_PATTERN,
  missingFields,
  toPayload,
  toSlug,
  type ApplicationForm,
} from "./application-form";
import { PinField } from "./pin-field";
import { StepLabel } from "./step-label";

/**
 * Step two: the restaurant itself.
 *
 * Every field the `restaurants` table requires, which is the reason this form is
 * as long as it is and the reason it is worth it: an approval that needed one
 * more thing from the applicant would mean an operator writing an email and
 * waiting a day, and this form is asked once. The bounds below are the API's own
 * (`RestaurantDetails` in app/schemas/catalog_admin.py), restated so a refusal
 * arrives under the field rather than as a banner after a round trip.
 *
 * Two things this form deliberately does NOT ask for:
 *
 *  - Whether the restaurant is open. Approval creates it closed, and its owner
 *    turns it on from Restaurant → settings once there is a menu behind it.
 *  - Anything about money owed to Foodishi. The commission is Foodishi's side of
 *    a commercial deal and is not an applicant's to declare.
 */

const TEXTAREA_CLASS =
  "w-full rounded-card border border-line-2 bg-surface px-3 py-2 font-sans text-sm text-ink placeholder:text-ink-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

export function RestaurantStep({
  userId,
  onSent,
}: {
  readonly userId: string;
  readonly onSent: () => void;
}): React.JSX.Element {
  const submit = useSubmitApplication(userId);
  const [form, setForm] = React.useState<ApplicationForm>(EMPTY_FORM);
  // Whether the slug is still following the name. One tap on the slug field ends
  // that for good — retyping somebody's chosen address under them is worse than
  // leaving it stale.
  const [isSlugDerived, setIsSlugDerived] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  function set<K extends keyof ApplicationForm>(
    key: K,
    value: ApplicationForm[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setName(value: string): void {
    setForm((current) => ({
      ...current,
      name: value,
      slug: isSlugDerived ? toSlug(value) : current.slug,
    }));
  }

  const missing = missingFields(form);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submit.isPending) return;
    // Not sent, and the reason is already on screen above the button; take the
    // applicant to the first thing it names rather than doing nothing.
    const first = missing[0];
    if (first !== undefined) {
      document.getElementById(first.fieldId)?.focus();
      return;
    }
    setError(null);
    try {
      await submit.mutateAsync(toPayload(form));
      onSent();
    } catch (cause) {
      // A 409 here is either "that web address is taken" or "you already have
      // one waiting", and both are the applicant's next instruction.
      setError(toUserMessage(cause));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error !== null ? (
        <ErrorBanner title="Could not send your application" message={error} />
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-4">
          <StepLabel step={2} of={2}>
            Your restaurant — this is what Foodishi reads
          </StepLabel>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => void handleSubmit(event)}
            noValidate
          >
            <Field label="Restaurant name" htmlFor="apply-restaurant-name">
              <Input
                id="apply-restaurant-name"
                required
                value={form.name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Anand Bhavan"
                className="min-h-11"
              />
            </Field>

            <Field
              label="Web address"
              htmlFor="apply-slug"
              hint="Lowercase words joined by hyphens. Customers see this in the link to your page, and it cannot be changed later without breaking it."
            >
              <Input
                id="apply-slug"
                mono
                required
                value={form.slug}
                onChange={(event) => {
                  setIsSlugDerived(false);
                  set("slug", event.target.value);
                }}
                error={
                  form.slug !== "" && !SLUG_PATTERN.test(form.slug.trim())
                    ? "Lowercase letters, numbers and single hyphens only."
                    : undefined
                }
                placeholder="anand-bhavan"
                className="min-h-11"
              />
            </Field>

            <Field
              label="Description"
              htmlFor="apply-description"
              hint="Optional. One or two lines, in the customer's words rather than the kitchen's."
            >
              <textarea
                id="apply-description"
                rows={3}
                value={form.description}
                onChange={(event) => set("description", event.target.value)}
                className={TEXTAREA_CLASS}
              />
            </Field>

            <div className="flex flex-wrap gap-4">
              <div className="min-w-[180px] flex-1">
                <Field label="City" htmlFor="apply-restaurant-city">
                  <Input
                    id="apply-restaurant-city"
                    required
                    value={form.city}
                    onChange={(event) => set("city", event.target.value)}
                    placeholder="Bengaluru"
                    className="min-h-11"
                  />
                </Field>
              </div>
              <div className="min-w-[180px] flex-1">
                <Field
                  label="Area"
                  htmlFor="apply-area"
                  hint="The neighbourhood customers would name."
                >
                  <Input
                    id="apply-area"
                    required
                    value={form.area}
                    onChange={(event) => set("area", event.target.value)}
                    placeholder="Jayanagar"
                    className="min-h-11"
                  />
                </Field>
              </div>
            </div>

            <Field label="Street address" htmlFor="apply-address">
              <Input
                id="apply-address"
                required
                value={form.address_line}
                onChange={(event) => set("address_line", event.target.value)}
                placeholder="12, 4th Block, Jayanagar"
                className="min-h-11"
              />
            </Field>

            <PinField
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={(latitude, longitude) =>
                setForm((current) => ({ ...current, latitude, longitude }))
              }
            />

            <div className="flex flex-wrap gap-4">
              <div className="min-w-[180px] flex-1">
                <Field
                  label="Kitchen phone"
                  htmlFor="apply-restaurant-phone"
                  hint="The line a rider or Foodishi support would call."
                >
                  <Input
                    id="apply-restaurant-phone"
                    type="tel"
                    inputMode="tel"
                    required
                    value={form.phone}
                    onChange={(event) => set("phone", event.target.value)}
                    placeholder="+91 80 4123 4567"
                    className="min-h-11"
                  />
                </Field>
              </div>
              <div className="min-w-[160px] flex-1">
                <Field
                  label="Price for two"
                  htmlFor="apply-price"
                  hint="Roughly, in rupees. Shown on your card in search."
                >
                  <Input
                    id="apply-price"
                    mono
                    inputMode="decimal"
                    required
                    value={form.price_for_two}
                    onChange={(event) => set("price_for_two", event.target.value)}
                    placeholder="450"
                    className="min-h-11"
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="min-w-[160px] flex-1">
                <Field
                  label="Typical prep time"
                  htmlFor="apply-prep"
                  hint={`Minutes, ${LIMITS.prepMin}–${LIMITS.prepMax}. Every delivery estimate a customer is shown starts from this.`}
                >
                  <Input
                    id="apply-prep"
                    mono
                    inputMode="numeric"
                    required
                    value={form.avg_prep_minutes}
                    onChange={(event) => set("avg_prep_minutes", event.target.value)}
                    placeholder="22"
                    className="min-h-11"
                  />
                </Field>
              </div>
              <div className="min-w-[130px] flex-1">
                <Field label="Opens" htmlFor="apply-opens">
                  <Input
                    id="apply-opens"
                    type="time"
                    required
                    value={form.opens_at}
                    onChange={(event) => set("opens_at", event.target.value)}
                    className="min-h-11"
                  />
                </Field>
              </div>
              <div className="min-w-[130px] flex-1">
                <Field
                  label="Closes"
                  htmlFor="apply-closes"
                  hint="After midnight is fine."
                >
                  <Input
                    id="apply-closes"
                    type="time"
                    required
                    value={form.closes_at}
                    onChange={(event) => set("closes_at", event.target.value)}
                    className="min-h-11"
                  />
                </Field>
              </div>
            </div>

            <Field
              label="Anything else Foodishi should know"
              htmlFor="apply-note"
              hint="Optional, and read by the person reviewing this — not by customers."
            >
              <textarea
                id="apply-note"
                rows={3}
                value={form.note}
                onChange={(event) => set("note", event.target.value)}
                placeholder="We already deliver with two other platforms. Opening a second outlet in March."
                className={TEXTAREA_CLASS}
              />
            </Field>

            {/* What is still missing, said next to the button it is holding
                back. The button used to be greyed out with no reason given. */}
            <div className="flex flex-col gap-2">
              {missing.length > 0 ? (
                <p id="apply-missing" className="text-[14px] leading-snug text-ink-2">
                  <span className="font-medium">Still needed:</span>{" "}
                  {missing.map((field) => field.label).join(", ")}
                </p>
              ) : null}
              <Button
                type="submit"
                size="lg"
                block
                aria-describedby={missing.length > 0 ? "apply-missing" : undefined}
                isPending={submit.isPending}
                pendingLabel="Sending your application…"
              >
                Send application
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
