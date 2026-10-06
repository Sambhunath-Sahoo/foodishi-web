"use client";

import * as React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@repo/ui";
import { MAX_NOTE_LENGTH, useDeliveryNotes } from "../lib/delivery-notes";

const PRESETS = [
  "Leave it at the door",
  "Call on arrival",
  "Do not ring the bell",
  "Hand it to security",
] as const;

/**
 * "Leave it at the gate." Sent WITH the order: OrderCreate carries
 * `delivery_note` (max 200 chars) and app/models/order.py persists it, so the
 * kitchen and the rider both see it.
 *
 * The draft is still held on the device until the order is placed, because there
 * is nothing to attach it to before then — but the copy no longer says the
 * kitchen will not receive it, which stopped being true when the field shipped
 * and left three screens asserting the opposite of what checkout was doing.
 */
export function DeliveryInstructionsField(): React.JSX.Element {
  const { draft, setDraft } = useDeliveryNotes();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery instructions</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const isOn = draft.trim() === preset;
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={isOn}
                onClick={() => setDraft(isOn ? "" : preset)}
                className={
                  isOn
                    ? "min-h-11 rounded-chip border border-accent bg-accent-soft px-3 py-1.5 text-[13px] font-medium text-accent"
                    : "min-h-11 rounded-chip border border-line bg-surface px-3 py-1.5 text-[13px] text-ink-2 hover:bg-surface-2"
                }
              >
                {preset}
              </button>
            );
          })}
        </div>

        <div>
          <label
            htmlFor="delivery-note"
            className="mb-1.5 block text-[13px] font-medium text-ink-2"
          >
            Anything else for the rider?{" "}
            <span className="font-normal text-ink-3">Optional</span>
          </label>
          <textarea
            id="delivery-note"
            value={draft}
            rows={2}
            maxLength={MAX_NOTE_LENGTH}
            placeholder="Flat 3B, second gate — the first one is locked after 10pm."
            onChange={(event) => setDraft(event.target.value)}
            className="w-full rounded-card border border-line bg-surface px-3 py-2 text-[14px] text-ink placeholder:text-ink-4 focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-accent"
          />
          <p className="mt-1 text-right text-[12px] tabular-nums text-ink-3">
            {`${draft.length}/${MAX_NOTE_LENGTH}`}
          </p>
        </div>

        <p className="text-[12px] leading-relaxed text-ink-3">
          Sent with your order — the kitchen and your rider both see this.
        </p>
      </CardBody>
    </Card>
  );
}
