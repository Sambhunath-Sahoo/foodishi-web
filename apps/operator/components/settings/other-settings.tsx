"use client";

import * as React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@repo/ui";
import {
  DecimalField,
  MoneyField,
  NumberField,
  SettingGrid,
  SwitchField,
  TextField,
} from "./setting-field";
import type {
  DeliverySettings,
  OrderRuleSettings,
  TaxSettings,
} from "../../lib/services/types";

/**
 * The three settings sections that are plain forms.
 *
 * They live in one file because they are the same shape — a card of fields over
 * one object — and splitting three eighty-line siblings across three files would
 * be filing rather than organising. Commission gets its own file because its
 * overrides are a list with their own behaviour.
 *
 * Every hint says what the number *does*, not what it is called. "Delivery fee"
 * needs no explanation; "surge multiplier" does, and the explanation is the
 * difference between an operator changing it on purpose and changing it because
 * it looked low.
 */

export function DeliverySettingsCard({
  value,
  onChange,
}: {
  readonly value: DeliverySettings;
  readonly onChange: (next: DeliverySettings) => void;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle>Delivery charges</CardTitle>
      </CardHeader>
      <CardBody className="py-4">
        <SettingGrid>
          <MoneyField
            id="delivery-base"
            label="Base fee"
            hint="Charged on every order before distance is counted."
            value={value.base_fee}
            onChange={(next) => onChange({ ...value, base_fee: next })}
          />
          <MoneyField
            id="delivery-per-km"
            label="Per kilometre"
            hint="Added for each kilometre between the kitchen and the customer."
            value={value.per_km_fee}
            onChange={(next) => onChange({ ...value, per_km_fee: next })}
          />
          <MoneyField
            id="delivery-free-above"
            label="Free delivery above"
            hint="Order value at which delivery costs the customer nothing. Has to sit above the base fee, or every order gets it free."
            value={value.free_delivery_above}
            onChange={(next) => onChange({ ...value, free_delivery_above: next })}
          />
          <MoneyField
            id="delivery-packaging"
            label="Packaging fee"
            hint="The platform default. A kitchen's own policy overrides it."
            value={value.packaging_fee}
            onChange={(next) => onChange({ ...value, packaging_fee: next })}
          />
          <DecimalField
            id="delivery-surge"
            label="Surge multiplier"
            hint="What the delivery fee is multiplied by when the platform is running behind. 1.0 means no surge at all."
            value={value.surge_multiplier}
            onChange={(next) => onChange({ ...value, surge_multiplier: next })}
            unit="×"
          />
          <NumberField
            id="delivery-surge-after"
            label="Surge kicks in after"
            hint="How far behind its promises the platform has to be running before the multiplier above applies."
            value={value.surge_after_minutes_late}
            onChange={(next) =>
              onChange({ ...value, surge_after_minutes_late: next })
            }
            min={0}
            max={180}
            unit="min late"
          />
          <DecimalField
            id="delivery-radius"
            label="Delivery radius"
            hint="Beyond this, a kitchen is not offered to the customer at all."
            value={value.max_distance_km}
            onChange={(next) => onChange({ ...value, max_distance_km: next })}
            unit="km"
          />
        </SettingGrid>
      </CardBody>
    </Card>
  );
}

export function TaxSettingsCard({
  value,
  onChange,
}: {
  readonly value: TaxSettings;
  readonly onChange: (next: TaxSettings) => void;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle>Tax</CardTitle>
      </CardHeader>
      <CardBody className="py-4">
        <SettingGrid>
          <NumberField
            id="tax-gst"
            label="GST rate"
            hint="Applied to the taxable part of every order. Commission is charged on the food value, never on this."
            value={value.gst_percent}
            onChange={(next) => onChange({ ...value, gst_percent: next })}
            min={0}
            max={99}
            unit="%"
          />
          <TextField
            id="tax-gstin"
            label="Platform GSTIN"
            hint="Printed on every customer receipt and on the kitchens' settlement statements."
            value={value.gstin}
            onChange={(next) => onChange({ ...value, gstin: next })}
            mono
          />
          <SwitchField
            label="Packaging is taxable"
            hint="When yes, the packaging fee is added to the taxable amount before GST is worked out."
            value={value.is_packaging_taxable}
            onChange={(next) => onChange({ ...value, is_packaging_taxable: next })}
          />
          <SwitchField
            label="Delivery is taxable"
            hint="When yes, the delivery fee is taxed as well as the food."
            value={value.is_delivery_taxable}
            onChange={(next) => onChange({ ...value, is_delivery_taxable: next })}
          />
        </SettingGrid>
      </CardBody>
    </Card>
  );
}

export function OrderRuleSettingsCard({
  value,
  onChange,
}: {
  readonly value: OrderRuleSettings;
  readonly onChange: (next: OrderRuleSettings) => void;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle>Order rules</CardTitle>
      </CardHeader>
      <CardBody className="py-4">
        <SettingGrid>
          <MoneyField
            id="rules-min-order"
            label="Minimum order"
            hint="Below this, checkout refuses the basket. A kitchen's own minimum can be higher."
            value={value.min_order_value}
            onChange={(next) => onChange({ ...value, min_order_value: next })}
          />
          <NumberField
            id="rules-max-items"
            label="Most items per order"
            hint="A ceiling on basket size, so one order cannot take a kitchen's whole evening."
            value={value.max_items_per_order}
            onChange={(next) => onChange({ ...value, max_items_per_order: next })}
            min={1}
            max={200}
            unit="items"
          />
          <NumberField
            id="rules-free-cancel"
            label="Free cancellation window"
            hint="How long after placing an order the customer can cancel for nothing. The window is frozen onto each order at checkout, so changing it does not move an existing one."
            value={value.free_cancellation_minutes}
            onChange={(next) =>
              onChange({ ...value, free_cancellation_minutes: next })
            }
            min={0}
            max={60}
            unit="min"
          />
          <NumberField
            id="rules-late-fee"
            label="Late cancellation fee"
            hint="Charged when a customer cancels after that window. This is the number support hears about."
            value={value.late_cancellation_fee_percent}
            onChange={(next) =>
              onChange({ ...value, late_cancellation_fee_percent: next })
            }
            min={0}
            max={100}
            unit="% of the order"
          />
          <NumberField
            id="rules-refund-sla"
            label="Refund promise"
            hint="How long the customer is told their money will take to come back. Every refund on the SLA watch is measured against this."
            value={value.refund_sla_hours}
            onChange={(next) => onChange({ ...value, refund_sla_hours: next })}
            min={1}
            max={720}
            unit="hours"
          />
          <NumberField
            id="rules-auto-cancel"
            label="Auto-cancel unconfirmed"
            hint="An order a kitchen has not accepted by then is cancelled on its behalf, so the customer is not left waiting on a closed kitchen."
            value={value.auto_cancel_unconfirmed_minutes}
            onChange={(next) =>
              onChange({ ...value, auto_cancel_unconfirmed_minutes: next })
            }
            min={1}
            max={120}
            unit="min"
          />
          <NumberField
            id="rules-buffer"
            label="Promise buffer"
            hint="Added to every delivery promise on top of prep and the ride, so a kitchen that is on time is not recorded as a minute late."
            value={value.prep_buffer_minutes}
            onChange={(next) => onChange({ ...value, prep_buffer_minutes: next })}
            min={0}
            max={60}
            unit="min"
          />
        </SettingGrid>
      </CardBody>
    </Card>
  );
}
