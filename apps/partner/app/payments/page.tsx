"use client";

import * as React from "react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  PageTitle,
  SegmentedControl,
  Stat,
  StatRail,
  TableFooter,
} from "@repo/ui";
import { LedgerTable } from "./ledger-table";
import { KitchenGate } from "../_components/kitchen-gate";
import { CardSkeletons, EmptyCard, LoadError } from "../_components/states";
import {
  formatCount,
  formatDay,
  formatMoney,
  formatMoneyRound,
  formatPercentPoints,
} from "../_lib/format";
import { RANGE_OPTIONS, describeRange, windowFor, type RangeKey } from "../_lib/windows";
import { useEarnings, useSettlements } from "../../lib/queries/reports";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { SettlementStatus } from "../../lib/types";

const STATUS_TONES: Readonly<
  Record<SettlementStatus, "ok" | "warn" | "mute" | "crit">
> = {
  paid: "ok",
  processing: "warn",
  scheduled: "mute",
  // A bank rejection. The loudest tone available, because this is the one payout
  // status that needs somebody to do something.
  failed: "crit",
};

const STATUS_LABELS: Readonly<Record<SettlementStatus, string>> = {
  paid: "Paid",
  processing: "Processing",
  scheduled: "Scheduled",
  failed: "Failed — contact Foodishi",
};

/**
 * What the restaurant earned, what came off it, and when the rest arrives.
 *
 * Every deduction is named and shown rather than netted away. A restaurant
 * reading this screen is answering one question — "why is the number in my bank
 * smaller than the number on my till" — and the only useful answer is the
 * subtraction, written out.
 *
 * Gross starts from the order total, delivery fee and all, because that is what
 * the customer paid through the platform and therefore what a single receipt can
 * be reconciled against.
 */
function Payments({ kitchen }: { readonly kitchen: ReadyKitchen }): React.JSX.Element {
  const now = React.useMemo(() => Date.now(), []);
  const [range, setRange] = React.useState<RangeKey>("30d");

  const window = React.useMemo(() => windowFor(range, now), [range, now]);
  const earnings = useEarnings(kitchen, window);
  const settlements = useSettlements(kitchen);

  return (
    <div className="flex flex-col gap-5">
      <SegmentedControl
        ariaLabel="Period"
        options={RANGE_OPTIONS}
        value={range}
        onValueChange={setRange}
      />

      {earnings.isPending ? (
        <CardSkeletons count={2} label="Adding up earnings" />
      ) : null}

      {earnings.error !== null ? (
        <LoadError
          error={earnings.error}
          title="Could not add up earnings"
          refusedTitle="Earnings are not on the live API yet"
          onRetry={() => {
            void earnings.refetch();
          }}
        />
      ) : null}

      {earnings.data !== undefined ? (
        <>
          <StatRail ariaLabel={`Earnings over ${describeRange(range).toLowerCase()}`}>
            <Stat
              label="Taken"
              value={formatMoneyRound(earnings.data.gross)}
              caption="Delivered orders, at full total"
              hint="What customers paid through the platform on delivered orders, delivery fee included. This is the figure a receipt can be reconciled against."
            />
            <Stat
              label="Commission"
              value={formatMoneyRound(earnings.data.commission)}
              caption={`${formatPercentPoints(earnings.data.commission_percent)} of what was taken`}
              hint="The platform's share. Deducted before settlement, never invoiced separately."
            />
            <Stat
              label="Tax on commission"
              value={formatMoneyRound(earnings.data.tax_on_commission)}
              caption="GST, at 18%"
              hint="GST on the platform's commission, which the restaurant also carries."
            />
            <Stat
              label="Yours"
              value={formatMoneyRound(earnings.data.net)}
              caption="After commission and its tax"
              hint="What is due to this restaurant for the period. Refunds on cancelled orders are shown separately — they were never in 'Taken'."
            />
            <Stat
              label="Still to come"
              value={formatMoneyRound(earnings.data.pending)}
              tone={Number(earnings.data.pending) > 0 ? "warn" : "default"}
              caption={`${formatMoneyRound(earnings.data.settled)} already paid out`}
              hint="Settlements that have not been paid yet, across every period — not just this one."
            />
          </StatRail>

          {Number(earnings.data.refunds) > 0 ? (
            <p className="rounded-card border border-line bg-surface-2 px-4 py-3 text-[13px] leading-snug text-ink-2">
              <span className="font-semibold">
                {formatMoney(earnings.data.refunds)} was refunded to customers
              </span>{" "}
              in this period, on orders that were cancelled or rejected. Those
              orders were never counted in what was taken, so this figure is not
              subtracted from it — it is here because it is money that moved, and
              a period with a lot of it is worth looking at.
            </p>
          ) : null}
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Settlements</CardTitle>
          <span className="text-[13px] text-ink-3">Every period, newest first</span>
        </CardHeader>
        <CardBody className="p-0">
          {settlements.isPending ? (
            <div className="p-4">
              <CardSkeletons count={1} label="Loading settlements" />
            </div>
          ) : null}

          {settlements.error !== null ? (
            <div className="p-4">
              <LoadError
                error={settlements.error}
                title="Could not load settlements"
                refusedTitle="Settlements are not on the live API yet"
                onRetry={() => {
                  void settlements.refetch();
                }}
              />
            </div>
          ) : null}

          {settlements.data !== undefined && settlements.data.length === 0 ? (
            <EmptyCard
              title="No settlements yet"
              detail="A settlement covers one week of delivered orders and lands in the restaurant's account a couple of days after the week closes."
            />
          ) : null}

          {settlements.data !== undefined && settlements.data.length > 0 ? (
            <DataTableScroll
              footer={
                <TableFooter
                  shown={settlements.data.length}
                  total={settlements.data.length}
                  noun="settlements"
                  sortedBy="newest period first"
                  extra={`${formatMoneyRound(
                    settlements.data
                      .filter((row) => row.status !== "paid")
                      .reduce((total, row) => total + Number(row.net), 0),
                  )} not yet paid`}
                />
              }
            >
              <DataTable>
                <DataTableHead>
                  <DataTableRow>
                    <DataTableHeaderCell>Reference</DataTableHeaderCell>
                    <DataTableHeaderCell>Period</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Orders</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Taken</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Commission</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Paid out</DataTableHeaderCell>
                    <DataTableHeaderCell>Status</DataTableHeaderCell>
                  </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                  {settlements.data.map((row) => (
                    <DataTableRow key={row.id} className="h-auto min-h-[48px]">
                      <DataTableCell mono className="text-ink">
                        {row.reference}
                        <span className="mt-0.5 block font-sans text-[12px] text-ink-3">
                          account ending {row.account_last4}
                        </span>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-ink-2">
                        {formatDay(row.period_from)} – {formatDay(row.period_to)}
                        {row.paid_at !== null ? (
                          <span className="mt-0.5 block text-[12px] text-ink-3">
                            paid {formatDay(row.paid_at)}
                          </span>
                        ) : null}
                      </DataTableCell>
                      <DataTableCell numeric mono className="text-ink-2">
                        {formatCount(row.orders_count)}
                      </DataTableCell>
                      <DataTableCell numeric mono className="text-ink-2">
                        {formatMoney(row.gross)}
                      </DataTableCell>
                      <DataTableCell numeric mono className="text-ink-3">
                        −{formatMoney(row.commission)}
                      </DataTableCell>
                      <DataTableCell numeric mono className="font-semibold text-ink">
                        {formatMoney(row.net)}
                      </DataTableCell>
                      <DataTableCell>
                        <Badge tone={STATUS_TONES[row.status]}>
                          {STATUS_LABELS[row.status]}
                        </Badge>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </DataTableScroll>
          ) : null}
        </CardBody>
      </Card>

      <LedgerTable kitchen={kitchen} />

      <p className="text-[12px] leading-snug text-ink-3">
        Commission and the tax on it are deducted before a settlement is paid, so
        the amount that reaches the bank is the &ldquo;Paid out&rdquo; column and
        nothing further comes off it. The commission rate is set by Foodishi and is
        not this console&rsquo;s to change.
      </p>
    </div>
  );
}

export default function PaymentsPage(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle subtitle="What was taken, what came off it, what has been paid, and what is still to come.">
        Payments
      </PageTitle>

      <KitchenGate
        loadingCards={2}
        loadingLabel="Adding up earnings"
        requires="payments.view"
      >
        {(kitchen) => <Payments kitchen={kitchen} />}
      </KitchenGate>
    </div>
  );
}
