"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  SkeletonRows,
  UsageBar,
} from "@repo/ui";
import {
  formatCount,
  formatDuration,
  formatMoneyWhole,
  formatRate,
} from "../lib/format";
import type { OrderReport } from "../lib/services/types";
import type { Workload } from "../lib/services/types";

/**
 * How the platform is doing, beside the chart of how much it sold.
 *
 * The operator's counterpart to the partner dashboard's "How the kitchen is
 * doing", and the same argument for existing: a revenue line tells you the
 * shape of the month and nothing about whether the month went well. On-time
 * delivery, the typical journey, how many kitchens have drifted and how much
 * money is owed back are the four figures that say that, and none of them is a
 * number a rail cell can carry with its caption.
 *
 * The bar comes first because it is the one figure with a target: an on-time
 * rate is read against 100% whether or not anybody says so, and a percentage in
 * a row of percentages is not.
 */
const ON_TIME_CONCERN = 0.9;

/** Below this the platform is not slow, it is broken. */
const ON_TIME_ALARM = 0.75;

function Row({
  label,
  value,
  href,
  tone,
}: {
  readonly label: string;
  readonly value: React.ReactNode;
  readonly href?: string;
  readonly tone?: "warn" | "crit";
}): React.JSX.Element {
  const figure = (
    <span
      className={
        tone === "crit"
          ? "font-mono tabular-nums text-crit"
          : tone === "warn"
            ? "font-mono tabular-nums text-warn"
            : "font-mono tabular-nums text-ink"
      }
    >
      {value}
    </span>
  );

  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-3">{label}</dt>
      <dd className="m-0">
        {href === undefined ? (
          figure
        ) : (
          <Link
            href={href}
            className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {figure}
          </Link>
        )}
      </dd>
    </div>
  );
}

export interface PlatformHealthProps {
  readonly report: OrderReport | undefined;
  readonly workload: Workload | undefined;
  readonly breachedRefunds: number | undefined;
  /** Named in the heading so the panel says which window it is describing. */
  readonly days: number;
}

export function PlatformHealth({
  report,
  workload,
  breachedRefunds,
  days,
}: PlatformHealthProps): React.JSX.Element {
  const delivered =
    report?.statuses.find((row) => row.status === "delivered")?.orders ?? 0;
  // On time is the complement of late, over what was actually delivered — an
  // order still in flight has not been late yet and cannot count either way.
  const onTime =
    report === undefined || delivered === 0
      ? null
      : (delivered - report.delivered_late) / delivered;

  return (
    <Card className="min-w-0">
      <CardHeader className="items-baseline py-3">
        <CardTitle>How the platform is doing</CardTitle>
        <span className="font-sans text-[12px] text-ink-3">
          last {formatCount(days)} days
        </span>
      </CardHeader>
      <CardBody className="flex flex-col gap-4 py-4">
        {report === undefined ? (
          <SkeletonRows rows={5} />
        ) : (
          <>
            <UsageBar
              label="Delivered on time"
              value={onTime === null ? 0 : Math.round(onTime * 100)}
              max={100}
              valueLabel={
                onTime === null ? "nothing delivered yet" : formatRate(onTime, 1)
              }
              tone={
                onTime === null
                  ? "mute"
                  : onTime < ON_TIME_ALARM
                    ? "crit"
                    : onTime < ON_TIME_CONCERN
                      ? "warn"
                      : "ok"
              }
            />

            <dl className="flex flex-col gap-2 text-[14px]">
              <Row
                label="Arrived late"
                value={formatCount(report.delivered_late)}
                tone={report.delivered_late > 0 ? "warn" : undefined}
              />
              <Row
                label="Typical journey"
                value={
                  report.avg_minutes_to_deliver === null
                    ? "—"
                    : formatDuration(report.avg_minutes_to_deliver)
                }
              />
              <Row
                label="Kitchens slipping"
                value={
                  workload === undefined
                    ? "—"
                    : formatCount(workload.restaurants_slipping)
                }
                href="/restaurants"
                tone={
                  workload !== undefined && workload.restaurants_slipping > 0
                    ? "warn"
                    : undefined
                }
              />
              <Row
                label="Refunds past SLA"
                value={
                  breachedRefunds === undefined ? "—" : formatCount(breachedRefunds)
                }
                href="/sla"
                tone={
                  breachedRefunds !== undefined && breachedRefunds > 0
                    ? "crit"
                    : undefined
                }
              />
              <Row
                label="Owed back to customers"
                value={
                  workload === undefined
                    ? "—"
                    : formatMoneyWhole(workload.refunds_owed)
                }
                href="/sla"
                tone={
                  workload !== undefined && workload.refunds_breached > 0
                    ? "crit"
                    : undefined
                }
              />
            </dl>

            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <Link
                href="/reports"
                className="rounded-card border border-line-2 bg-surface px-3 py-1.5 font-sans text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Full reports
              </Link>
              <Link
                href="/sla"
                className="rounded-card border border-line-2 bg-surface px-3 py-1.5 font-sans text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                SLA watch
              </Link>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
