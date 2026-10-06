"use client";

import * as React from "react";
import { Button, Field, Input } from "@repo/ui";
import { isValidPin } from "./application-form";

/** Four places is about 11 metres: enough to find a door, short enough to read. */
const SHOWN_DECIMALS = 4;
/** What the API stores; more than this is noise from the device's fix. */
const STORED_DECIMALS = 6;
/** A phone indoors can take a while to get a fix; past this, say so. */
const LOCATE_TIMEOUT_MS = 15_000;

type LocateState =
  | { readonly kind: "idle" }
  | { readonly kind: "locating" }
  | { readonly kind: "failed"; readonly message: string };

/**
 * The browser's reason, in the applicant's words. Refusal is the common case —
 * a headless browser, a privacy setting, a tap on "Block" — and none of them is
 * a dead end, because the pin can always be set by hand.
 */
function describeFailure(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "This browser was not allowed to share its location. Set the pin by hand below.";
  }
  if (error.code === error.TIMEOUT) {
    return "Finding this device took too long. Try again by the door, or set the pin by hand below.";
  }
  return "This device could not work out where it is. Set the pin by hand below.";
}

export interface PinFieldProps {
  readonly latitude: string;
  readonly longitude: string;
  readonly onChange: (latitude: string, longitude: string) => void;
}

/**
 * Where the restaurant's door is, which the delivery fee is measured from.
 *
 * An owner was asked to type a latitude and a longitude, which nobody knows.
 * The tablet or phone filling in this form is usually standing in the
 * restaurant, so it is asked first; typing the numbers is still there, behind a
 * disclosure, for an owner applying from home or a browser that says no.
 */
export function PinField({ latitude, longitude, onChange }: PinFieldProps): React.JSX.Element {
  const [locate, setLocate] = React.useState<LocateState>({ kind: "idle" });
  const [isByHandOpen, setIsByHandOpen] = React.useState(false);

  const hasPin = isValidPin(latitude, longitude);

  function locateDevice(): void {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocate({
        kind: "failed",
        message: "This browser cannot share a location. Set the pin by hand below.",
      });
      setIsByHandOpen(true);
      return;
    }
    setLocate({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(
          position.coords.latitude.toFixed(STORED_DECIMALS),
          position.coords.longitude.toFixed(STORED_DECIMALS),
        );
        setLocate({ kind: "idle" });
      },
      (error) => {
        setLocate({ kind: "failed", message: describeFailure(error) });
        setIsByHandOpen(true);
      },
      { enableHighAccuracy: true, timeout: LOCATE_TIMEOUT_MS, maximumAge: 0 },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-sans text-[13px] font-medium text-ink-2">Map pin</span>

      {hasPin ? (
        <p className="flex flex-wrap items-center gap-x-2 text-[15px] text-ink">
          <span>Pin set</span>
          <span aria-hidden="true" className="text-ink-4">
            ·
          </span>
          <span className="font-mono tabular-nums">
            {Number(latitude).toFixed(SHOWN_DECIMALS)}, {Number(longitude).toFixed(SHOWN_DECIMALS)}
          </span>
          <span aria-hidden="true" className="text-ink-4">
            ·
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11"
            onClick={() => setIsByHandOpen(true)}
          >
            Change
          </Button>
        </p>
      ) : null}

      {hasPin ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            id="apply-use-location"
            type="button"
            variant="outline"
            className="min-h-11"
            isPending={locate.kind === "locating"}
            pendingLabel="Finding this device…"
            onClick={locateDevice}
          >
            Use this device&apos;s location
          </Button>
          <span className="text-[13px] text-ink-3">
            Best done standing at the restaurant. The delivery fee is measured from here.
          </span>
        </div>
      )}

      {locate.kind === "failed" ? (
        <p role="status" className="text-[14px] text-ink-2">
          {locate.message}
        </p>
      ) : null}

      <details
        open={isByHandOpen}
        onToggle={(event) => setIsByHandOpen(event.currentTarget.open)}
        className="group"
      >
        {/* inline-flex drops the browser's disclosure triangle, so the
            chevron is drawn: shape as well as the accent colour says "opens". */}
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[14px] font-medium text-accent [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="inline-block text-[18px] leading-none transition-transform group-open:rotate-90">
            ›
          </span>
          Set the pin by hand
        </summary>
        <div className="flex flex-wrap gap-4 pt-2">
          <div className="min-w-[160px] flex-1">
            <Field
              label="Latitude"
              htmlFor="apply-latitude"
              hint="From a map pin on your door."
            >
              <Input
                id="apply-latitude"
                mono
                inputMode="decimal"
                required
                value={latitude}
                onChange={(event) => onChange(event.target.value, longitude)}
                placeholder="12.925000"
                className="min-h-11"
              />
            </Field>
          </div>
          <div className="min-w-[160px] flex-1">
            <Field label="Longitude" htmlFor="apply-longitude">
              <Input
                id="apply-longitude"
                mono
                inputMode="decimal"
                required
                value={longitude}
                onChange={(event) => onChange(latitude, event.target.value)}
                placeholder="77.583000"
                className="min-h-11"
              />
            </Field>
          </div>
        </div>
      </details>
    </div>
  );
}
