"use client";

import * as React from "react";
import { Field, Input, SegmentedControl } from "@repo/ui";

/**
 * The three shapes a platform setting comes in, so no section invents its own.
 *
 * Money stays a string all the way through — it is a decimal the API sends as
 * text, and running it through a number input would put a float between the
 * operator and the rupee. Counts are integers. Switches are a segmented control
 * rather than a checkbox, because "Yes / No" beside a label reads at a glance
 * and a lone tick beside "Delivery is taxable" reads as a question.
 *
 * Each field takes a `hint` and every caller passes one. A settings screen where
 * the reader has to guess what a number does is where the platform's pricing
 * gets broken by somebody being careful.
 */

const MONEY_PATTERN = "^[0-9]+(\\.[0-9]{1,2})?$";

export interface MoneyFieldProps {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
}

export function MoneyField({
  id,
  label,
  hint,
  value,
  onChange,
}: MoneyFieldProps): React.JSX.Element {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="font-mono text-[13px] text-ink-3">
          ₹
        </span>
        <Input
          id={id}
          mono
          inputMode="decimal"
          pattern={MONEY_PATTERN}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </Field>
  );
}

export interface NumberFieldProps {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly value: number;
  readonly onChange: (next: number) => void;
  readonly min?: number;
  readonly max?: number;
  /** Appended after the box: "%", "min", "days". */
  readonly unit?: string;
}

export function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  min = 0,
  max,
  unit,
}: NumberFieldProps): React.JSX.Element {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          mono
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={String(value)}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            // An empty box is 0, not NaN: NaN would reach the service and be
            // refused with a message about a number the reader never typed.
            onChange(Number.isFinite(parsed) ? parsed : 0);
          }}
        />
        {unit === undefined ? null : (
          <span className="shrink-0 font-sans text-[13px] text-ink-3">{unit}</span>
        )}
      </div>
    </Field>
  );
}

export interface DecimalFieldProps {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly unit?: string;
}

/** A decimal that is not money — a multiplier, a distance. */
export function DecimalField({
  id,
  label,
  hint,
  value,
  onChange,
  unit,
}: DecimalFieldProps): React.JSX.Element {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          mono
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {unit === undefined ? null : (
          <span className="shrink-0 font-sans text-[13px] text-ink-3">{unit}</span>
        )}
      </div>
    </Field>
  );
}

export interface SwitchFieldProps {
  readonly label: string;
  readonly hint: string;
  readonly value: boolean;
  readonly onChange: (next: boolean) => void;
}

const SWITCH_OPTIONS = [
  { value: "yes" as const, label: "Yes" },
  { value: "no" as const, label: "No" },
];

export function SwitchField({
  label,
  hint,
  value,
  onChange,
}: SwitchFieldProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-sans text-[13px] font-medium text-ink-2">{label}</span>
      <SegmentedControl
        ariaLabel={label}
        options={SWITCH_OPTIONS}
        value={value ? "yes" : "no"}
        onValueChange={(next) => onChange(next === "yes")}
      />
      <p className="text-[12px] text-ink-3">{hint}</p>
    </div>
  );
}

export interface TextFieldProps {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly mono?: boolean;
}

export function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  mono = false,
}: TextFieldProps): React.JSX.Element {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <Input
        id={id}
        mono={mono}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

/** Two or three fields to a row on a wide screen, one on a narrow one. */
export function SettingGrid({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
  );
}
