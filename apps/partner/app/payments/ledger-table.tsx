"use client";

import * as React from "react";
import Link from "next/link";
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
  Pagination,
  TableFooter,
} from "@repo/ui";
import { CardSkeletons, EmptyCard, LoadError } from "../_components/states";
import { formatDateTime, formatSignedMoney } from "../_lib/format";
import { useLedger } from "../../lib/queries/reports";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { LedgerKind } from "../../lib/types";

const PAGE_SIZE = 25;

const KIND_LABELS: Readonly<Record<LedgerKind, string>> = {
  order: "Order",
  commission: "Commission",
  refund: "Refund",
  payout: "Paid out",
};

const KIND_TONES: Readonly<Record<LedgerKind, "ok" | "mute" | "crit" | "accent">> = {
  order: "ok",
  commission: "mute",
  refund: "crit",
  payout: "accent",
};

/**
 * Every line of the money trail, newest first.
 *
 * One row per thing that happened rather than a per-order summary, because the
 * question this table answers is "what is this charge" — and a commission line
 * that could not be traced back to the order it came off would be exactly as
 * useless as no table at all. So an order line and its commission line sit next
 * to each other, both naming the order, and the order number is a link.
 *
 * Signs are kept. A deduction reads as a deduction.
 */
export function LedgerTable({
  kitchen,
}: {
  readonly kitchen: ReadyKitchen;
}): React.JSX.Element {
  const [offset, setOffset] = React.useState(0);
  const ledger = useLedger(kitchen, PAGE_SIZE, offset);

  const rows = ledger.data?.items ?? [];
  const total = ledger.data?.total ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Every transaction</CardTitle>
        <span className="text-[13px] text-ink-3">Newest first</span>
      </CardHeader>
      <CardBody className="p-0">
        {ledger.isPending ? (
          <div className="p-4">
            <CardSkeletons count={1} label="Loading transactions" />
          </div>
        ) : null}

        {ledger.error !== null ? (
          <div className="p-4">
            <LoadError
              error={ledger.error}
              title="Could not load transactions"
              refusedTitle="The transaction trail is not on the live API yet"
              onRetry={() => {
                void ledger.refetch();
              }}
            />
          </div>
        ) : null}

        {ledger.data !== undefined && rows.length === 0 ? (
          <EmptyCard
            title="Nothing has moved yet"
            detail="Every delivered order, every commission deduction, every refund and every payout is written here with the time it happened."
          />
        ) : null}

        {rows.length > 0 ? (
          <DataTableScroll
            footer={
              <>
                <TableFooter
                  shown={rows.length}
                  total={total}
                  noun="transactions"
                  sortedBy="most recent first"
                />
                <Pagination
                  total={total}
                  limit={PAGE_SIZE}
                  offset={offset}
                  onOffsetChange={setOffset}
                  noun="transactions"
                />
              </>
            }
          >
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>When</DataTableHeaderCell>
                  <DataTableHeaderCell>What</DataTableHeaderCell>
                  <DataTableHeaderCell>Detail</DataTableHeaderCell>
                  <DataTableHeaderCell numeric>Amount</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {rows.map((entry) => {
                  const isDeduction = Number(entry.amount) < 0;
                  return (
                    <DataTableRow key={entry.id}>
                      <DataTableCell mono className="whitespace-nowrap text-ink-3">
                        {formatDateTime(entry.occurred_at)}
                      </DataTableCell>
                      <DataTableCell>
                        <Badge tone={KIND_TONES[entry.kind]}>
                          {KIND_LABELS[entry.kind]}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell wrap className="max-w-[380px] text-ink-2">
                        {entry.order_id === null ? (
                          entry.description
                        ) : (
                          <Link
                            href={`/orders/${entry.order_id}`}
                            className="text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          >
                            {entry.description}
                          </Link>
                        )}
                      </DataTableCell>
                      <DataTableCell
                        numeric
                        mono
                        className={isDeduction ? "text-ink-3" : "text-ink"}
                      >
                        {formatSignedMoney(entry.amount)}
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          </DataTableScroll>
        ) : null}
      </CardBody>
    </Card>
  );
}
