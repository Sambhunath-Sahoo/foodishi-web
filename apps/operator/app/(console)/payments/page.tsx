"use client";

import * as React from "react";
import Link from "next/link";
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  FilterChip,
  Input,
  Pagination,
  PageTitle,
  SegmentedControl,
  SEVERITY_LABEL,
  SeverityCell,
  Stat,
  StatRail,
  TableFooter,
  Toolbar,
} from "@repo/ui";
import {
  BoardSkeleton,
  RailSkeleton,
} from "../../../components/board-skeleton";
import { CommissionLedgerTable } from "../../../components/commission-ledger-table";
import { OrderDrawer } from "../../../components/order-drawer";
import { QueryState } from "../../../components/query-state";
import { StageCards, type Stage } from "../../../components/stage-cards";
import {
  formatCount,
  formatDateTime,
  formatMoney,
  formatMoneyWhole,
  formatOrderRef,
  humanizeEnum,
  toNumber,
} from "../../../lib/format";
import { DECK_PAGE, DECK_PANEL, DECK_RAIL } from "../../../lib/deck";
import { paymentStatusTone } from "../../../lib/sla";
import {
  LEDGER_DEFAULT_DAYS,
  TRANSACTION_PAGE_SIZE,
  useLedger,
  usePaymentCounts,
  useSummary,
  useTransactions,
} from "../../../lib/queries";
import type { PaymentStatus } from "../../../lib/api-types";

type View = "transactions" | "commission";

const VIEW_OPTIONS = [
  { value: "transactions" as const, label: "Transactions" },
  { value: "commission" as const, label: "Commission" },
];

const ANY = "any";

/** The four questions asked of a transactions list, as one control. */

const SCOPE_WORDS: Record<string, string> = {
  [ANY]: "every attempt, in any state",
  captured: "money that reached the platform",
  authorized: "money committed but not yet collected",
  failed: "attempts that never went through",
  // `pending` had no entry, so the footer fell through to "showing everything"
  // while the table was filtered to one state — a filtered money table asserting
  // the opposite of what was on screen.
  pending: "orders still waiting to be paid",
  refunded: "payments sent back to the customer, fully or in part",
};

/**
 * What each stage card actually filters to.
 *
 * "Sent back" folds two statuses together for its COUNT, so it has to filter on
 * both or the count and the rows disagree.
 *
 * Keyed by the card values. A card with no entry here falls through to `?? null`
 * — i.e. "every status" — which is a silent wrong answer rather than a compile
 * error, because `scope` is a plain string. Every card value in `stages` below
 * has an entry; keep it that way when adding one.
 */
const SCOPE_STATUSES: Record<string, readonly PaymentStatus[]> = {
  captured: ["captured"],
  authorized: ["authorized"],
  failed: ["failed"],
  pending: ["pending"],
  refunded: ["refunded", "partially_refunded"],
};

/**
 * How each method reads in a row. Only UPI is an acronym; "WALLET" shouting at
 * the reader is the enum value leaking into the product (DENSITY.md §6).
 */
const METHOD_LABEL: Readonly<Record<string, string>> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Netbanking",
  wallet: "Wallet",
  cod: "Cash on delivery",
};

const METHOD_OPTIONS = [
  { value: ANY, label: "Any method" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "netbanking", label: "Netbanking" },
  { value: "wallet", label: "Wallet" },
  { value: "cod", label: "Cash on delivery" },
];

const LEDGER_RANGE_OPTIONS = [
  { value: "7" as const, label: "7 days" },
  { value: "30" as const, label: "30 days" },
  { value: "90" as const, label: "90 days" },
];

type LedgerRange = "7" | "30" | "90";

/**
 * Money in, and what the platform keeps of it.
 *
 * Two views rather than two pages, because they are the same money read twice: a
 * transaction is what a customer paid, and a commission row is Foodishi's share of
 * the ones that were delivered. Splitting them across the sidebar would invite
 * the reader to compare a figure on one screen against a figure on another and
 * find they disagree, when the only honest answer is that they measure different
 * things.
 *
 * Refunds are not here. Money going back has its own clock and its own promise,
 * so it lives on the SLA watch, and this page links to it rather than showing a
 * second, shorter version of the same queue.
 */
export default function PaymentsPage(): React.JSX.Element {
  const [view, setView] = React.useState<View>("transactions");

  return (
    <div className={DECK_PAGE}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle subtitle="Every payment attempt, and what the platform keeps of the ones that worked.">
          Payments
        </PageTitle>
        <SegmentedControl
          ariaLabel="Which view"
          options={VIEW_OPTIONS}
          value={view}
          onValueChange={setView}
        />
      </div>

      {view === "transactions" ? <TransactionsView /> : <CommissionView />}
    </div>
  );
}

/* ----------------------------------------------------------- transactions */

function TransactionsView(): React.JSX.Element {
  const [scope, setScope] = React.useState<string>(ANY);
  const [method, setMethod] = React.useState<string>(ANY);
  const [term, setTerm] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  const [openOrderId, setOpenOrderId] = React.useState<number | null>(null);

  const transactions = useTransactions({
    q: query,
    statuses: scope === ANY ? null : (SCOPE_STATUSES[scope] ?? null),
    method: method === ANY ? null : method,
    limit: TRANSACTION_PAGE_SIZE,
    offset,
  });
  const summary = useSummary();
  const counts = usePaymentCounts();

  /**
   * The scope filter, as four cards that count themselves.
   *
   * Counted across every attempt rather than from the page, which is the whole
   * point: the rail this replaces reported "Failed 0" whenever the newest forty
   * attempts happened to contain none, on a platform holding twenty-nine.
   *
   * Refunded folds `partially_refunded` in with it. The distinction matters on a
   * row, where the amount is beside it; as a card it would be two numbers for
   * one idea — money went back.
   */
  const stages: readonly Stage<string>[] = React.useMemo(
    () => [
      {
        value: "captured",
        label: "Captured",
        caption: "Money reached the platform",
        count: counts.data?.captured,
        chip: <Badge tone="ok">Captured</Badge>,
      },
      {
        value: "failed",
        label: "Failed",
        caption: "Tried to pay and could not",
        count: counts.data?.failed,
        tone: "crit",
        chip: <Badge tone="crit">Failed</Badge>,
      },
      {
        // `authorized` had NO card, so the most operationally interesting
        // payment state -- money committed but not collected -- was counted in
        // the total, appeared in the unfiltered table, and had no control that
        // could isolate it. The card counts never added up to the total printed
        // beside them.
        value: "authorized",
        label: "Authorized",
        caption: "Committed, not yet collected",
        count: counts.data?.authorized,
        tone: "warn",
        chip: <Badge tone="warn">Authorized</Badge>,
      },
      {
        value: "pending",
        label: "Awaiting payment",
        caption: "Cash on delivery, or unpaid",
        count: counts.data?.pending,
        tone: "warn",
        chip: <Badge tone="warn">Pending</Badge>,
      },
      {
        value: "refunded",
        label: "Sent back",
        caption: "Refunded, fully or in part",
        count:
          counts.data === undefined
            ? undefined
            : counts.data.refunded + counts.data.partially_refunded,
        chip: <Badge tone="cool">Refunded</Badge>,
      },
    ],
    [counts.data],
  );

  const narrow = React.useCallback((apply: () => void) => {
    apply();
    setOffset(0);
  }, []);

  return (
    <>
      <StageCards
        ariaLabel="Which attempts to show"
        stages={stages}
        active={scope === ANY ? stages.map((stage) => stage.value) : [scope]}
        onSelect={(next) => narrow(() => setScope(next === scope ? ANY : next))}
        note={
          counts.data === undefined ? (
            "Counting every attempt…"
          ) : (
            <>
              <button
                type="button"
                onClick={() => narrow(() => setScope(ANY))}
                className="font-medium text-accent underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {formatCount(
                  Object.values(counts.data).reduce((sum, value) => sum + value, 0),
                )}{" "}
                attempts in total
              </button>
              {" · "}
              {summary.data === undefined
                ? null
                : `${formatMoneyWhole(summary.data.commission_revenue)} kept as commission`}
              {" · press a card again to clear it"}
            </>
          )
        }
      />

      <QueryState
        query={transactions}
        errorTitle="The transactions ledger could not load"
        emptyTitle={
          query === ""
            ? `No ${SCOPE_WORDS[scope] ?? "transactions"}`
            : `Nothing matches “${query}”`
        }
        emptyDetail={
          query === ""
            ? "A row appears here for every payment attempt, including the ones that failed."
            : "The search matches an order id and the payment provider's own reference."
        }
        isEmpty={(page) => page.items.length === 0}
        skeleton={
          <>
            <RailSkeleton label="Counting the money" />
            <BoardSkeleton
              rows={12}
              label="Loading transactions"
              note="Reading every payment attempt…"
            />
          </>
        }
      >
        {(page) => {
          return (
            <>
              <Toolbar ariaLabel="Transaction filters">
                <SegmentedControl
                  ariaLabel="Which payment method"
                  options={METHOD_OPTIONS}
                  value={method}
                  onValueChange={(next) => narrow(() => setMethod(next))}
                />
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    narrow(() => setQuery(term.trim()));
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    placeholder="Order or provider ref"
                    aria-label="Search transactions by order id or provider reference"
                    className="h-8 w-[210px] text-[13px]"
                  />
                </form>
                {query === "" ? null : (
                  <FilterChip
                    label="Matching"
                    value={query}
                    onDismiss={() =>
                      narrow(() => {
                        setTerm("");
                        setQuery("");
                      })
                    }
                  />
                )}
                <FilterChip
                  label="Refunds live on the SLA watch"
                  tone="accent"
                  title="Money going back has its own promise and its own clock, so it is worked from there rather than from this list."
                />
              </Toolbar>

              <DataTableScroll
                className={DECK_PANEL}
                footer={
                  <>
                    <TableFooter
                      shown={page.items.length}
                      total={page.total}
                      noun="payment attempts"
                      sortedBy="when the attempt was made, newest first"
                      extra={`showing ${SCOPE_WORDS[scope] ?? "everything"}`}
                    />
                    <Pagination
                      total={page.total}
                      limit={page.limit}
                      offset={page.offset}
                      onOffsetChange={setOffset}
                      noun="payment attempts"
                      className="border-t border-line"
                    />
                  </>
                }
              >
                <DataTable aria-label="Payment attempts, newest first">
                  <DataTableHead>
                    <tr>
                      <DataTableHeaderCell className="pl-4">
                        Payment
                      </DataTableHeaderCell>
                      <DataTableHeaderCell>Order</DataTableHeaderCell>
                      <DataTableHeaderCell>Method</DataTableHeaderCell>
                      <DataTableHeaderCell>Provider</DataTableHeaderCell>
                      <DataTableHeaderCell>Reference</DataTableHeaderCell>
                      <DataTableHeaderCell>State</DataTableHeaderCell>
                      <DataTableHeaderCell>Attempted</DataTableHeaderCell>
                      <DataTableHeaderCell numeric>Amount</DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {page.items.map((payment) => {
                      // A failed attempt carries the top severity rule: it is
                      // the only row on this table anybody has to do something
                      // about (DENSITY.md §3).
                      const tier = payment.status === "failed" ? 3 : 0;

                      return (
                        <DataTableRow
                          key={payment.id}
                          selected={payment.order_id === openOrderId}
                        >
                          <SeverityCell
                            tier={tier}
                            mono
                            title={SEVERITY_LABEL[tier]}
                          >
                            #{payment.id}
                          </SeverityCell>
                          <DataTableCell>
                            <button
                              type="button"
                              onClick={() => setOpenOrderId(payment.order_id)}
                              aria-label={`Open order ${formatOrderRef(payment.order_id)}`}
                              className="rounded-card font-mono text-[12px] font-medium text-accent underline underline-offset-2 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                              {formatOrderRef(payment.order_id)}
                            </button>
                          </DataTableCell>
                          <DataTableCell className="text-ink-2">
                            {METHOD_LABEL[payment.method] ??
                              humanizeEnum(payment.method)}
                          </DataTableCell>
                          <DataTableCell className="text-ink-3 capitalize">
                            {payment.provider}
                          </DataTableCell>
                          <DataTableCell mono className="max-w-[180px]">
                            {payment.provider_ref ?? (
                              <span className="text-ink-4">none</span>
                            )}
                          </DataTableCell>
                          <DataTableCell className="max-w-[240px]">
                            <Badge tone={paymentStatusTone(payment.status)}>
                              {humanizeEnum(payment.status)}
                            </Badge>
                            {payment.failed_reason === null ? null : (
                              <span className="block truncate text-[12px] text-crit">
                                {payment.failed_reason}
                              </span>
                            )}
                          </DataTableCell>
                          <DataTableCell mono>
                            {formatDateTime(payment.created_at)}
                          </DataTableCell>
                          <DataTableCell numeric>
                            {formatMoney(payment.amount)}
                          </DataTableCell>
                        </DataTableRow>
                      );
                    })}
                  </DataTableBody>
                </DataTable>
              </DataTableScroll>
            </>
          );
        }}
      </QueryState>

      <OrderDrawer orderId={openOrderId} onClose={() => setOpenOrderId(null)} />
    </>
  );
}

/* ------------------------------------------------------------- commission */

function CommissionView(): React.JSX.Element {
  const [range, setRange] = React.useState<LedgerRange>(
    String(LEDGER_DEFAULT_DAYS) as LedgerRange,
  );
  const ledger = useLedger(Number.parseInt(range, 10));

  return (
    <QueryState
      query={ledger}
      errorTitle="The commission ledger could not load"
      emptyTitle="Nothing delivered in this window"
      emptyDetail="Commission is charged on delivered orders only, so a window with no deliveries earns nothing."
      isEmpty={(data) => data.rows.every((row) => row.delivered_orders === 0)}
      skeleton={
        <>
          <RailSkeleton label="Adding up the commission" />
          <BoardSkeleton
            rows={12}
            label="Loading the commission ledger"
            note="Working out each kitchen's share…"
          />
        </>
      }
    >
      {(data) => {
        const earning = data.rows.filter((row) => row.delivered_orders > 0);
        const negotiated = data.rows.filter((row) => row.is_negotiated).length;

        return (
          <>
            <div className={DECK_RAIL}>
              <StatRail ariaLabel="Commission over the window">
                <Stat
                  label="Gross delivered"
                  value={formatMoneyWhole(data.gross)}
                  caption={`Across ${formatCount(earning.length)} kitchens`}
                  hint="What customers paid for delivered orders in this window, all in — food, packaging, delivery and tax."
                />
                <Stat
                  label="Food value"
                  value={formatMoneyWhole(data.food_value)}
                  caption="What commission is charged on"
                  hint="Commission is taken on the food alone. Delivery and packaging are pass-through, and taking a percentage of the tax would be taking a percentage of the government's money."
                />
                <Stat
                  label="Commission"
                  value={formatMoneyWhole(data.commission)}
                  tone="ok"
                  caption={`${formatCount(toNumber(data.default_percent))}% standard rate`}
                  hint="Foodishi's earnings from this window. Two kitchens are on a negotiated rate; their rows say so."
                />
                <Stat
                  label="Owed to kitchens"
                  value={formatMoneyWhole(data.payout)}
                  caption={`Settled ${formatCount(data.settlement_days)} days after delivery`}
                  hint="Gross less commission: what the platform owes its restaurants for this window."
                />
                <Stat
                  label="Off standard rate"
                  value={formatCount(negotiated)}
                  tone={negotiated > 0 ? "warn" : "default"}
                  caption={
                    negotiated > 0
                      ? "Negotiated separately"
                      : "Everyone on the same rate"
                  }
                  hint="Kitchens whose commission was agreed outside the platform default. The rate and the reason are set on the Settings page."
                />
              </StatRail>
            </div>

            <Toolbar ariaLabel="Commission window">
              <SegmentedControl
                ariaLabel="How far back to add up"
                options={LEDGER_RANGE_OPTIONS}
                value={range}
                onValueChange={setRange}
              />
              <FilterChip
                label="Delivered orders only"
                tone="accent"
                title="An order in flight or cancelled earns the platform nothing until it is handed over."
              />
              <p className="font-sans text-[12px] text-ink-3">
                Rates are configured on{" "}
                <Link
                  href="/settings"
                  className="font-medium text-accent underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Settings
                </Link>
                .
              </p>
            </Toolbar>

            <CommissionLedgerTable ledger={data} className={DECK_PANEL} />
          </>
        );
      }}
    </QueryState>
  );
}
