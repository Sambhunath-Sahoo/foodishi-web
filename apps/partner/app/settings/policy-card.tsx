"use client";

import * as React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@repo/ui";
import { LoadError } from "../_components/states";
import { formatMoney, formatPercentPoints } from "../_lib/format";
import { useRestaurantPolicy } from "../../lib/queries/restaurant";
import type { ReadyKitchen } from "../../lib/kitchen";

/**
 * The charges and windows this restaurant trades under — read-only, and
 * deliberately so.
 *
 * Every one of these is part of the platform's contract with the customer: the
 * delivery fee they were quoted, the window in which they can change their
 * mind, how long a refund may take. A restaurant that could edit its own
 * cancellation window could take a customer's money and then shorten the window
 * they had already been promised.
 *
 * It is still shown, in full, because a manager fielding "why was I charged
 * ₹87 for delivery" needs the answer more than they need the ability to change
 * it. The line at the bottom says who to ask.
 */
export function PolicyCard({
  kitchen,
}: {
  readonly kitchen: ReadyKitchen;
}): React.JSX.Element {
  const policy = useRestaurantPolicy(kitchen);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Charges and windows</CardTitle>
        <span className="text-[13px] text-ink-3">Read-only here</span>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        {policy.isPending ? (
          <Skeleton className="h-24 w-full" label="Loading the charges" />
        ) : null}

        {policy.error !== null ? (
          <LoadError
            error={policy.error}
            title="Could not load the charges"
            refusedTitle="The charges are not this restaurant's to read"
            onRetry={() => {
              void policy.refetch();
            }}
          />
        ) : null}

        {policy.data !== undefined ? (
          <>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
              <div className="flex justify-between gap-3 border-b border-line pb-1.5">
                <dt className="text-ink-3">Packaging</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {formatMoney(policy.data.packaging_fee)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-line pb-1.5">
                <dt className="text-ink-3">Minimum order</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {formatMoney(policy.data.min_order_value)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-line pb-1.5">
                <dt className="text-ink-3">Delivery, base</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {formatMoney(policy.data.delivery_fee_base)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-line pb-1.5">
                <dt className="text-ink-3">Delivery, per km</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {formatMoney(policy.data.delivery_fee_per_km)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-line pb-1.5">
                <dt className="text-ink-3">Free delivery above</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {policy.data.free_delivery_above === null
                    ? "No free delivery"
                    : formatMoney(policy.data.free_delivery_above)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-line pb-1.5">
                <dt className="text-ink-3">Delivers up to</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {policy.data.max_delivery_distance_km} km
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-line pb-1.5">
                <dt className="text-ink-3">Free cancellation window</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {policy.data.cancellation_window_mins} min
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-line pb-1.5">
                <dt className="text-ink-3">Cancellation fee after that</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {formatPercentPoints(policy.data.cancellation_fee_percent)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-line pb-1.5">
                <dt className="text-ink-3">Refunds due within</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {policy.data.refund_sla_hours} h
                </dd>
              </div>
            </dl>

            <p className="text-[13px] leading-snug text-ink-3">
              These are the terms a customer was quoted before they ordered, and
              they are frozen onto every order at the moment it is placed — so
              changing them here does not rewrite a promise already made. The
              cancellation fee is charged only when a customer changes their own
              mind; this restaurant&rsquo;s own refusals are always free to them.
            </p>
            <p className="text-[12px] leading-snug text-ink-3">
              A manager <em>can</em> change these — the platform allows it on
              this restaurant&rsquo;s own policy. This screen does not offer it
              yet, because a fee edit wants a confirm that spells out what the
              next customer will be charged, and that is its own piece of work.
              Ask Foodishi in the meantime.
            </p>
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}
