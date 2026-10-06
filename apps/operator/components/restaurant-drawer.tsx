"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import {
  Badge,
  Button,
  ErrorBanner,
  Field,
  Input,
  Skeleton,
  SkeletonRows,
  Thumb,
} from "@repo/ui";
import { QueryState } from "./query-state";
import { Sheet } from "./sheet";
import {
  formatCount,
  formatDuration,
  formatMoney,
  formatRate,
} from "../lib/format";
import {
  useRestaurant,
  useRestaurantMetrics,
  useSetRestaurantActive,
  useUpdateRestaurant,
} from "../lib/queries";
import type { RestaurantDetail } from "../lib/api-types";
import type { RestaurantPatch } from "../lib/services/types";

/** The cover at the top of the panel. */
const COVER_PX = 44;

export interface RestaurantDrawerProps {
  readonly restaurantId: number | null;
  readonly onClose: () => void;
}

function Section({
  title,
  aside,
  children,
}: {
  readonly title: string;
  readonly aside?: React.ReactNode;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="mb-5 last:mb-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="font-sans text-[11px] font-semibold tracking-wide uppercase text-ink-3">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function DetailRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <span className="shrink-0 font-sans text-[13px] text-ink-3">{label}</span>
      <span className="min-w-0 text-right font-sans text-[13px] text-ink-2">
        {children}
      </span>
    </div>
  );
}

/** "09:00:00" -> "09:00", which is what a time input wants. */
function toClockInput(clock: string): string {
  return clock.slice(0, 5);
}

/** The editable fields, as they stand on the saved restaurant. */
function toDraft(restaurant: RestaurantDetail): RestaurantPatch {
  return {
    name: restaurant.name,
    description: restaurant.description ?? "",
    city: restaurant.city,
    area: restaurant.area,
    address_line: restaurant.address_line,
    phone: restaurant.phone,
    price_for_two: restaurant.price_for_two,
    avg_prep_minutes: restaurant.avg_prep_minutes,
    opens_at: toClockInput(restaurant.opens_at),
    closes_at: toClockInput(restaurant.closes_at),
  };
}

/**
 * One kitchen, and the two things an operator does to it: correct its details,
 * or stop it taking orders.
 *
 * The prep time is the field to be careful with and the form says so, because
 * every delivery promise the platform makes to a customer is built on it. A
 * kitchen quoting twenty minutes that really takes fifty is not slow — it is
 * making the platform lie, and this is the box where that gets fixed.
 *
 * Switching a kitchen off is separated from the form on purpose. It has its own
 * button, its own confirmation copy and its own call, so a stray Enter in a text
 * field can never close a restaurant.
 */
export function RestaurantDrawer({
  restaurantId,
  onClose,
}: RestaurantDrawerProps): React.JSX.Element {
  const restaurant = useRestaurant(restaurantId);
  const metrics = useRestaurantMetrics();
  const update = useUpdateRestaurant();
  const setActive = useSetRestaurantActive();

  const [draft, setDraft] = React.useState<RestaurantPatch | null>(null);
  const [saved, setSaved] = React.useState(false);

  // Re-seeded when the saved kitchen changes -- but NEVER over an edit in
  // progress.
  //
  // "which is exactly on save" was not true. The Taking-orders switch in this
  // same drawer invalidates keys.restaurants.all, which is a PREFIX of
  // keys.restaurants.one(id), so the detail query refetches and `loaded` becomes
  // a new object. This effect then overwrote the draft, the "Unsaved" badge
  // disappeared, and the edit was gone with no message: correct the prep time
  // from 20 to 45, then switch the kitchen off, and the prep-time correction is
  // silently discarded while the operator has every reason to think both landed.
  //
  // `seededFor` holds WHICH kitchen the draft belongs to, and `seededFrom` the
  // snapshot it was seeded from. Both are needed, and the first one is the one
  // that matters most: this drawer is mounted once and never keyed by
  // restaurantId (see app/(console)/restaurants/page.tsx), so `draft` outlives
  // the record it describes. Guarding only on "has this been typed in" meant
  // editing kitchen A and then opening kitchen B kept A's draft on screen under
  // B's heading, with the Unsaved badge encouraging a save that would write A's
  // name, phone, address and prep time onto B's id. A different kitchen always
  // re-seeds; the same kitchen re-seeds only while untouched.
  const loaded = restaurant.data;
  const seededFor = React.useRef<number | null>(null);
  const seededFrom = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (loaded === undefined) return;
    const next = toDraft(loaded);
    const serialised = JSON.stringify(next);
    setDraft((current) => {
      const isDifferentKitchen = seededFor.current !== loaded.id;
      // Already in step with the server -- which is what a successful save
      // leaves behind. Re-syncing the snapshot here rather than leaving it on
      // the pre-edit value is what lets the NEXT refetch seed normally; without
      // it the drawer stayed permanently "touched" after one save and would
      // never show a change made anywhere else again.
      const matchesServer = current !== null && JSON.stringify(current) === serialised;
      const isUntouched =
        current === null || JSON.stringify(current) === seededFrom.current;
      if (!isDifferentKitchen && !isUntouched && !matchesServer) return current;
      seededFor.current = loaded.id;
      seededFrom.current = serialised;
      return matchesServer && !isDifferentKitchen ? current : next;
    });
  }, [loaded]);

  // A different kitchen is a different panel: nothing about the last one's
  // outcome belongs on it. The draft is cleared here too, so the effect above
  // cannot render one kitchen's values while another's request is still in
  // flight -- `loaded` is stale for exactly that window.
  React.useEffect(() => {
    setDraft(null);
    seededFor.current = null;
    seededFrom.current = null;
    setSaved(false);
    update.reset();
    setActive.reset();
    // The mutations' identities are stable; clearing on a new kitchen is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const patch = React.useCallback((next: RestaurantPatch) => {
    setDraft((current) => ({ ...current, ...next }));
    setSaved(false);
  }, []);

  const isDirty =
    draft !== null &&
    loaded !== undefined &&
    JSON.stringify(draft) !== JSON.stringify(toDraft(loaded));

  const pending = update.isPending || setActive.isPending;
  const error = update.error ?? setActive.error;

  const commit = React.useCallback(() => {
    if (draft === null || restaurantId === null) return;
    setSaved(false);
    update.mutate(
      { restaurantId, patch: draft },
      { onSuccess: () => setSaved(true) },
    );
  }, [draft, restaurantId, update]);

  const own = metrics.data?.items.find((row) => row.restaurant_id === restaurantId);

  return (
    <Sheet
      open={restaurantId !== null}
      onClose={onClose}
      title={
        loaded === undefined ? (
          <Skeleton className="h-4 w-40" label="Loading the kitchen" />
        ) : (
          <span className="flex items-center gap-2">
            <Thumb src={loaded.image_url} name={loaded.name} size={COVER_PX} />
            <span className="truncate">{loaded.name}</span>
            {loaded.is_active ? null : <Badge tone="mute">Switched off</Badge>}
          </span>
        )
      }
      subtitle={
        loaded === undefined ? (
          <Skeleton className="h-3 w-52" label="Loading the kitchen's details" />
        ) : (
          <>
            {loaded.area}, {loaded.city} · {loaded.rating}★ from{" "}
            {formatCount(loaded.rating_count)} · {loaded.cuisines.map((c) => c.name).join(", ")}
          </>
        )
      }
    >
      {restaurantId === null ? null : (
        <>
          {error === null ? null : (
            <div className="mb-4">
              <ErrorBanner
                title="That change was not saved"
                message={toUserMessage(error)}
              />
            </div>
          )}

          <QueryState
            query={restaurant}
            errorTitle="This kitchen could not load"
            emptyTitle="No such restaurant"
            emptyDetail="Every kitchen on the platform has a record here."
            skeleton={<SkeletonRows rows={6} />}
          >
            {(place) => (
              <>
                <Section
                  title="How it is doing"
                  aside={
                    <span className="font-sans text-[11px] text-ink-3">all time</span>
                  }
                >
                  {own === undefined ? (
                    <p className="font-sans text-[13px] text-ink-3">
                      This kitchen has not taken an order yet, so there is nothing to
                      measure it on.
                    </p>
                  ) : (
                    <>
                      <DetailRow label="Orders taken">
                        {formatCount(own.order_count)}
                      </DetailRow>
                      <DetailRow label="Revenue delivered">
                        {formatMoney(own.revenue)}
                      </DetailRow>
                      <DetailRow label="Cancelled">
                        {formatRate(own.cancellation_rate, 1)} of its own orders
                      </DetailRow>
                      <DetailRow label="Declared prep">
                        {formatDuration(own.avg_prep_minutes)}
                      </DetailRow>
                      <DetailRow label="Really takes">
                        {own.avg_delivery_minutes === null
                          ? "no deliveries yet"
                          : `${formatDuration(own.avg_delivery_minutes)} end to end`}
                      </DetailRow>
                    </>
                  )}
                </Section>

                <Section
                  title="Details"
                  aside={
                    saved ? (
                      <Badge tone="ok">Saved</Badge>
                    ) : isDirty ? (
                      <Badge tone="mute">Unsaved</Badge>
                    ) : null
                  }
                >
                  {draft === null ? (
                    <SkeletonRows rows={4} />
                  ) : (
                    <div className="flex flex-col gap-3">
                      <Field label="Name" htmlFor="kitchen-name">
                        <Input
                          id="kitchen-name"
                          value={draft.name ?? ""}
                          onChange={(event) => patch({ name: event.target.value })}
                        />
                      </Field>
                      <Field
                        label="Description"
                        htmlFor="kitchen-description"
                        hint="One line, shown under the name in the customer app."
                      >
                        <Input
                          id="kitchen-description"
                          value={draft.description ?? ""}
                          onChange={(event) =>
                            patch({ description: event.target.value })
                          }
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Area" htmlFor="kitchen-area">
                          <Input
                            id="kitchen-area"
                            value={draft.area ?? ""}
                            onChange={(event) => patch({ area: event.target.value })}
                          />
                        </Field>
                        <Field label="City" htmlFor="kitchen-city">
                          <Input
                            id="kitchen-city"
                            value={draft.city ?? ""}
                            onChange={(event) => patch({ city: event.target.value })}
                          />
                        </Field>
                      </div>
                      <Field label="Street address" htmlFor="kitchen-address">
                        <Input
                          id="kitchen-address"
                          value={draft.address_line ?? ""}
                          onChange={(event) =>
                            patch({ address_line: event.target.value })
                          }
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Phone"
                          htmlFor="kitchen-phone"
                          hint="Support calls this number when an order stalls."
                        >
                          <Input
                            id="kitchen-phone"
                            mono
                            value={draft.phone ?? ""}
                            onChange={(event) => patch({ phone: event.target.value })}
                          />
                        </Field>
                        <Field
                          label="Price for two"
                          htmlFor="kitchen-price"
                          hint="Shown on the customer's discovery list."
                        >
                          <Input
                            id="kitchen-price"
                            mono
                            inputMode="decimal"
                            value={draft.price_for_two ?? ""}
                            onChange={(event) =>
                              patch({ price_for_two: event.target.value })
                            }
                          />
                        </Field>
                      </div>
                      <Field
                        label="Declared prep time"
                        htmlFor="kitchen-prep"
                        hint="Minutes. Every delivery promise the platform makes to a customer is built on this number — a kitchen quoting less than it really takes makes the platform run late on every order."
                      >
                        <Input
                          id="kitchen-prep"
                          mono
                          type="number"
                          min={5}
                          max={120}
                          value={String(draft.avg_prep_minutes ?? 0)}
                          onChange={(event) => {
                            const parsed = Number.parseInt(event.target.value, 10);
                            patch({
                              avg_prep_minutes: Number.isFinite(parsed) ? parsed : 0,
                            });
                          }}
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Opens" htmlFor="kitchen-opens">
                          <Input
                            id="kitchen-opens"
                            mono
                            type="time"
                            value={draft.opens_at ?? ""}
                            onChange={(event) =>
                              patch({ opens_at: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Closes" htmlFor="kitchen-closes">
                          <Input
                            id="kitchen-closes"
                            mono
                            type="time"
                            value={draft.closes_at ?? ""}
                            onChange={(event) =>
                              patch({ closes_at: event.target.value })
                            }
                          />
                        </Field>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={commit}
                          isPending={update.isPending}
                          pendingLabel="Saving…"
                          disabled={!isDirty || pending}
                        >
                          Save details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDraft(toDraft(place));
                            setSaved(false);
                          }}
                          disabled={!isDirty || pending}
                        >
                          Discard
                        </Button>
                      </div>
                    </div>
                  )}
                </Section>

                <Section title="Taking orders">
                  <p className="mb-2 font-sans text-[13px] text-ink-3">
                    {place.is_active
                      ? "Customers can order from this kitchen now. Switching it off hides it from the app immediately; orders already in flight are unaffected and its history is kept."
                      : "This kitchen is hidden from the app and cannot take a new order. Everything it has ever delivered is still counted in the reports."}
                  </p>
                  <Button
                    variant={place.is_active ? "danger" : "primary"}
                    size="sm"
                    isPending={setActive.isPending}
                    pendingLabel={place.is_active ? "Switching off…" : "Switching on…"}
                    disabled={pending}
                    onClick={() =>
                      setActive.mutate({
                        restaurantId: place.id,
                        isActive: !place.is_active,
                      })
                    }
                  >
                    {place.is_active
                      ? "Stop this kitchen taking orders"
                      : "Let this kitchen take orders again"}
                  </Button>
                </Section>

                {place.policy === null ? null : (
                  <Section
                    title="Delivery policy"
                    aside={
                      <span className="font-sans text-[11px] text-ink-3">
                        this kitchen&apos;s own
                      </span>
                    }
                  >
                    <DetailRow label="Free cancellation">
                      {formatDuration(place.policy.cancellation_window_mins)} after
                      placing
                    </DetailRow>
                    <DetailRow label="Late cancellation fee">
                      {formatRate(
                        Number.parseFloat(place.policy.cancellation_fee_percent) / 100,
                        0,
                      )}{" "}
                      of the order
                    </DetailRow>
                    <DetailRow label="Refund promise">
                      {formatCount(place.policy.refund_sla_hours)} hours
                    </DetailRow>
                    <DetailRow label="Delivery fee">
                      {formatMoney(place.policy.delivery_fee_base)} +{" "}
                      {formatMoney(place.policy.delivery_fee_per_km)} per km
                    </DetailRow>
                    <DetailRow label="Free delivery above">
                      {place.policy.free_delivery_above === null
                        ? "never"
                        : formatMoney(place.policy.free_delivery_above)}
                    </DetailRow>
                    <DetailRow label="Packaging">
                      {formatMoney(place.policy.packaging_fee)}
                    </DetailRow>
                    <DetailRow label="Minimum order">
                      {formatMoney(place.policy.min_order_value)}
                    </DetailRow>
                    <DetailRow label="Delivers up to">
                      {place.policy.max_delivery_distance_km} km
                    </DetailRow>
                  </Section>
                )}
              </>
            )}
          </QueryState>
        </>
      )}
    </Sheet>
  );
}
