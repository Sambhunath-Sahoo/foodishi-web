"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { Button, Dialog, ErrorBanner, Field, Input } from "@repo/ui";
import { useCreateAddress } from "../lib/queries/addresses";
import { FIELD_TAP_TARGET } from "../lib/tap-targets";
import type { Address } from "../lib/types";
import { APP_DIALOG } from "../lib/app-column";

/**
 * The form behind "Add a new address".
 *
 * PLACEHOLDER COORDINATES. AddressCreate requires latitude and longitude
 * because the delivery fee and the distance check are computed from them, but
 * real delivery is not wired up yet and nobody types their own coordinates. So
 * both go in as 0 for now. The consequence is explicit: any distance measured
 * from a saved address is measured from the equator, so delivery fees and the
 * max-distance rule are meaningless until this is replaced with a geocode or a
 * location prompt. The form deliberately does not ask, rather than asking for
 * something it would then ignore.
 */
const PLACEHOLDER_COORD = "0";

/** The API validates 6 digits not starting with 0; mirror it so the field can. */
const PINCODE_PATTERN = "[1-9][0-9]{5}";

export function AddressForm({
  userId,
  onSaved,
}: {
  readonly userId: number | null;
  /** Called with the saved row so the picker can select it immediately. */
  readonly onSaved?: (address: Address) => void;
}): React.JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false);
  const create = useCreateAddress(userId);

  const close = React.useCallback(() => {
    setIsOpen(false);
    create.reset();
  }, [create]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const line2 = String(form.get("line2") ?? "").trim();

      try {
        const saved = await create.mutateAsync({
          label: String(form.get("label") ?? ""),
          line1: String(form.get("line1") ?? ""),
          // The column is nullable; an empty box means "no landmark", not "".
          line2: line2 === "" ? null : line2,
          city: String(form.get("city") ?? ""),
          pincode: String(form.get("pincode") ?? ""),
          latitude: PLACEHOLDER_COORD,
          longitude: PLACEHOLDER_COORD,
        });
        onSaved?.(saved);
        close();
      } catch {
        // create.error carries it, and the banner below renders the server's
        // own words — a duplicate label and a bad pincode read differently.
      }
    },
    [create, onSaved, close],
  );

  if (userId === null) return <></>;

  return (
    <>
      <Button variant="outline" size="md" className="h-11" onClick={() => setIsOpen(true)}>
        Add a new address
      </Button>

      <Dialog

        className={APP_DIALOG}
        open={isOpen}
        onOpenChange={(next) => (next ? setIsOpen(true) : close())}
        title="Add a delivery address"
        description="Saved to your account, so you only type it once."
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
          {create.error !== null ? (
            <ErrorBanner
              title="Could not save this address"
              message={toUserMessage(create.error)}
            />
          ) : null}

          <Field label="Label" htmlFor="address-label">
            <Input
              className={FIELD_TAP_TARGET}
              id="address-label"
              name="label"
              required
              maxLength={40}
              autoFocus
              placeholder="Home"
            />
          </Field>

          <Field label="Flat, building, street" htmlFor="address-line1">
            <Input
              className={FIELD_TAP_TARGET}
              id="address-line1"
              name="line1"
              required
              minLength={3}
              maxLength={240}
              placeholder="12, Ambedkar Road"
            />
          </Field>

          <Field label="Landmark (optional)" htmlFor="address-line2">
            <Input
              className={FIELD_TAP_TARGET}
              id="address-line2"
              name="line2"
              maxLength={240}
              placeholder="Near Indiranagar Metro"
            />
          </Field>

          <div className="flex gap-3">
            <div className="flex-1">
              <Field label="City" htmlFor="address-city">
                <Input
                  className={FIELD_TAP_TARGET}
                  id="address-city"
                  name="city"
                  required
                  minLength={2}
                  maxLength={60}
                  placeholder="Bengaluru"
                />
              </Field>
            </div>
            <div className="w-32">
              <Field label="Pincode" htmlFor="address-pincode">
                <Input
                  className={FIELD_TAP_TARGET}
                  id="address-pincode"
                  name="pincode"
                  required
                  inputMode="numeric"
                  pattern={PINCODE_PATTERN}
                  placeholder="560038"
                />
              </Field>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="md" className="h-11" onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="md"
              className="h-11"
              isPending={create.isPending}
              pendingLabel="Saving…"
            >
              Save address
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
