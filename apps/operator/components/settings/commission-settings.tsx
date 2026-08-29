"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Select,
} from "@repo/ui";
import { NumberField, SettingGrid } from "./setting-field";
import { RowAction } from "../row-action";
import { formatCount } from "../../lib/format";
import type { RestaurantSummary } from "../../lib/api-types";
import type { CommissionSettings } from "../../lib/services/types";

export interface CommissionSettingsCardProps {
  readonly value: CommissionSettings;
  readonly onChange: (next: CommissionSettings) => void;
  /** For naming an override and offering the kitchens without one. */
  readonly restaurants: readonly RestaurantSummary[];
}

/**
 * The platform's cut, and the kitchens that negotiated their way off it.
 *
 * The overrides are the reason this section is not two number inputs. A rate
 * agreed with one restaurant is a commercial fact that outlives whoever agreed
 * it, so each carries a note saying why — and the note is a required part of the
 * row rather than a comment somebody might add. A rate nobody can explain is one
 * nobody dares change.
 *
 * Every edit returns a new settings object. Nothing here mutates what it was
 * handed: the page holds the draft, and a control that quietly edited the saved
 * value in place would leave "unsaved changes" unable to tell.
 */
export function CommissionSettingsCard({
  value,
  onChange,
  restaurants,
}: CommissionSettingsCardProps): React.JSX.Element {
  const [adding, setAdding] = React.useState("");

  const named = React.useMemo(
    () => new Map(restaurants.map((row) => [row.id, row.name])),
    [restaurants],
  );

  const available = React.useMemo(
    () =>
      restaurants
        .filter(
          (row) =>
            !value.overrides.some((override) => override.restaurant_id === row.id),
        )
        .sort((left, right) => left.name.localeCompare(right.name)),
    [restaurants, value.overrides],
  );

  const addOverride = React.useCallback(() => {
    const restaurantId = Number.parseInt(adding, 10);
    if (!Number.isFinite(restaurantId)) return;
    onChange({
      ...value,
      overrides: [
        ...value.overrides,
        { restaurant_id: restaurantId, percent: value.default_percent, note: "" },
      ],
    });
    setAdding("");
  }, [adding, onChange, value]);

  const patchOverride = React.useCallback(
    (restaurantId: number, patch: { percent?: number; note?: string }) => {
      onChange({
        ...value,
        overrides: value.overrides.map((override) =>
          override.restaurant_id === restaurantId
            ? { ...override, ...patch }
            : override,
        ),
      });
    },
    [onChange, value],
  );

  const removeOverride = React.useCallback(
    (restaurantId: number) => {
      onChange({
        ...value,
        overrides: value.overrides.filter(
          (override) => override.restaurant_id !== restaurantId,
        ),
      });
    },
    [onChange, value],
  );

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle>Commission</CardTitle>
        <Badge tone="mute" dot={false}>
          {formatCount(value.overrides.length)} negotiated
        </Badge>
      </CardHeader>
      <CardBody className="flex flex-col gap-5 py-4">
        <SettingGrid>
          <NumberField
            id="commission-default"
            label="Standard rate"
            hint="Charged on the food value of every delivered order. Delivery, packaging and tax are not commissionable."
            value={value.default_percent}
            onChange={(next) => onChange({ ...value, default_percent: next })}
            min={1}
            max={99}
            unit="%"
          />
          <NumberField
            id="commission-settlement"
            label="Settlement delay"
            hint="How long after delivery a kitchen is paid what it is owed."
            value={value.settlement_days}
            onChange={(next) => onChange({ ...value, settlement_days: next })}
            min={1}
            max={60}
            unit="days"
          />
        </SettingGrid>

        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-sans text-[13px] font-semibold text-ink">
              Kitchens on their own rate
            </h3>
            <p className="font-sans text-[12px] text-ink-3">
              Every override needs a reason. It outlives whoever agreed it.
            </p>
          </div>

          {value.overrides.length === 0 ? (
            <EmptyState
              title="Every kitchen is on the standard rate"
              detail="Add an override when a restaurant has negotiated something different."
              className="py-6"
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {value.overrides.map((override) => (
                <li
                  key={override.restaurant_id}
                  className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface-2 px-3 py-2"
                >
                  <span className="min-w-[160px] flex-1 font-sans text-[13px] font-medium text-ink">
                    {named.get(override.restaurant_id) ??
                      `Restaurant ${String(override.restaurant_id)}`}
                  </span>
                  <label className="flex items-center gap-2">
                    <span className="font-sans text-[12px] text-ink-3">Rate</span>
                    <Input
                      mono
                      type="number"
                      min={1}
                      max={99}
                      aria-label={`Commission rate for ${named.get(override.restaurant_id) ?? "this kitchen"}`}
                      value={String(override.percent)}
                      onChange={(event) => {
                        const parsed = Number.parseInt(event.target.value, 10);
                        patchOverride(override.restaurant_id, {
                          percent: Number.isFinite(parsed) ? parsed : 0,
                        });
                      }}
                      className="h-9 w-[84px]"
                    />
                    <span className="font-sans text-[13px] text-ink-3">%</span>
                  </label>
                  <label className="flex min-w-[240px] flex-[2] items-center gap-2">
                    <span className="shrink-0 font-sans text-[12px] text-ink-3">
                      Why
                    </span>
                    <Input
                      aria-label={`Reason for the negotiated rate at ${named.get(override.restaurant_id) ?? "this kitchen"}`}
                      placeholder="Renegotiated at launch"
                      value={override.note}
                      onChange={(event) =>
                        patchOverride(override.restaurant_id, {
                          note: event.target.value,
                        })
                      }
                      className="h-9"
                    />
                  </label>
                  <RowAction
                    tone="danger"
                    onClick={() => removeOverride(override.restaurant_id)}
                    title="Put this kitchen back on the standard rate."
                    ariaLabel={`Remove the override for ${named.get(override.restaurant_id) ?? "this kitchen"}`}
                  >
                    Remove
                  </RowAction>
                </li>
              ))}
            </ul>
          )}

          {available.length === 0 ? null : (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Add a commission override for a kitchen"
                options={[
                  { value: "", label: "Add an override for…" },
                  ...available.map((row) => ({
                    value: String(row.id),
                    label: row.name,
                  })),
                ]}
                value={adding}
                onChange={(event) => setAdding(event.target.value)}
                className="h-9 w-[240px] text-[13px]"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={addOverride}
                disabled={adding === ""}
              >
                Add override
              </Button>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
