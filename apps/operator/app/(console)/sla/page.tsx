"use client";

import * as React from "react";
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  ErrorBanner,
  FilterChip,
  Freshness,
  Input,
  Pagination,
  PageTitle,
  SEVERITY_LABEL,
  SEVERITY_TEXT,
  SeverityCell,
  TableFooter,
  Toolbar,
} from "@repo/ui";
import { toUserMessage } from "@repo/api-client";
import { BoardSkeleton } from "../../../components/board-skeleton";
import { OrderDrawer } from "../../../components/order-drawer";
import { QueryState } from "../../../components/query-state";
import { RowAction, RowActions } from "../../../components/row-action";
import { SettleRefundDialog } from "../../../components/settle-refund-dialog";
import { StageCards, type Stage } from "../../../components/stage-cards";
import {
  formatCount,
  formatDateTime,
  formatElapsed,
  formatMoney,
  formatMoneyWhole,
  formatOrderRef,
  hoursBetween,
  humanizeEnum,
  toNumber,
} from "../../../lib/format";
import { DECK_PAGE, DECK_PANEL } from "../../../lib/deck";
import { refundStatusTone, refundTier } from "../../../lib/sla";
import {
  REFUND_PAGE_SIZE,
  useCompleteRefund,
  useRefundCounts,
  useRefunds,
  useRetryRefund,
} from "../../../lib/queries";
import { useNow } from "../../../lib/use-now";
import type { RefundDetail, RefundStatus } from "../../../lib/api-types";
import { useOpenOrder } from "../../../lib/use-open-order";

const MINUTES_PER_HOUR = 60;

type Scope = "breached" | "all";

const ANY_STATUS = "any";

/** Not a refund status — a predicate across three of them. See `stages`. */
const BREACHED = "__breached";

/**
 * Refunds the customer was promised and has not been paid.
 *
 * The verdict is the platform's, not this page's: `sla_breached` arrives on the
 * row, decided by the same rule everywhere — past the due time and not yet
 * completed, with a failed refund counting because the money never went back.
 * That is what keeps this list and the overview's alarm from disagreeing.
 *
 * Two actions per row, and they are deliberately different things. Retrying
 * hands the refund back to the provider and leaves it *processing* — the
 * customer does not have their money yet, and a button that claimed otherwise
 * would be the worst lie on the screen. Settling by hand is for when the money
 * was moved another way and the record has to catch up.
 */
export default function SlaPage(): React.JSX.Element {
  const nowMs = useNow();
  // Unfiltered by default. It opened on the Breached filter, which rang that
  // card before anybody pressed it (OP-6) — and it never needed to: the server
  // orders every refund breached-first, longest overdue at the top, so the
  // unfiltered list already leads with exactly what the filter showed.
  const [scope, setScope] = React.useState<Scope>("all");
  const [status, setStatus] = React.useState<string>(ANY_STATUS);
  const [term, setTerm] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  // In the URL as ?order=, so an open order survives a reload and can be
  // pasted to a colleague (OP-4).
  const {
    orderId: openOrderId,
    open: openOrder,
    close: closeOrder,
  } = useOpenOrder();

  const refunds = useRefunds({
    q: query,
    status: status === ANY_STATUS ? null : (status as RefundStatus),
    breachedOnly: scope === "breached",
    limit: REFUND_PAGE_SIZE,
    offset,
  });

  const counts = useRefundCounts();
  const retry = useRetryRefund();
  const settle = useCompleteRefund();
  const actionError = retry.error ?? settle.error;
  const [settling, setSettling] = React.useState<RefundDetail | null>(null);

  const submitSearch = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setQuery(term.trim());
      setOffset(0);
    },
    [term],
  );

  const changeScope = React.useCallback((next: Scope) => {
    setScope(next);
    setOffset(0);
  }, []);

  const changeStatus = React.useCallback((next: string) => {
    setStatus(next);
    setOffset(0);
  }, []);

  /**
   * The two controls this page used to carry, as one row of cards.
   *
   * "Past SLA" is not a status — it is a predicate that crosses three of them —
   * so it cannot be a fifth option on a status filter, which is exactly why the
   * page had a scope control AND a status select stacked together. As a card it
   * sits beside them honestly: press it and the queue narrows to the refunds
   * that are actually late, whatever state they are in.
   *
   * Counted across every refund, not from the page: the debt is what it is
   * whether or not this page is showing it.
   */
  const stages: readonly Stage<string>[] = React.useMemo(
    () => [
      {
        value: BREACHED,
        label: "Past SLA",
        caption:
          counts.data === undefined
            ? "Money still not returned"
            : `${formatMoneyWhole(counts.data.owed)} owed back`,
        count: counts.data?.breached,
        tone: "crit",
        chip: <Badge tone="crit">Late</Badge>,
      },
      {
        value: "failed",
        label: "Failed outright",
        caption: "Retry these before anything else",
        count: counts.data?.byStatus.failed,
        chip: <Badge tone="crit">Failed</Badge>,
      },
      {
        value: "processing",
        label: "With the provider",
        caption: "Asked for, not landed yet",
        count: counts.data?.byStatus.processing,
        chip: <Badge tone="warn">Processing</Badge>,
      },
      {
        value: "completed",
        label: "Settled",
        caption: "The customer has their money",
        count: counts.data?.byStatus.completed,
        chip: <Badge tone="ok">Completed</Badge>,
      },
    ],
    [counts.data],
  );

  /** A card press means one of two different things, so it is resolved here. */
  const selectStage = React.useCallback(
    (value: string) => {
      setOffset(0);
      if (value === BREACHED) {
        // Pressing the ringed card again clears it, like every other card.
        setScope((current) => (current === "breached" ? "all" : "breached"));
        setStatus(ANY_STATUS);
        return;
      }
      setScope("all");
      setStatus((current) => (current === value ? ANY_STATUS : value));
    },
    [],
  );

  // Built once and rendered in two places: above the table, and above the
  // empty state. A search or a filter that matches nothing must leave the
  // controls on screen to undo it — inside the results they vanished with the
  // rows, and "clear the filters" pointed at filters nobody could see.
  const filters = (
    // No freshness stamp on the right: the table footer already says when the
    // queue was read, and this copy rendered at body size, twice the weight of
    // every other "updated" in the console.
    <Toolbar ariaLabel="Refund queue filters">
      <form onSubmit={submitSearch} className="flex items-center gap-2">
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Refund, order or provider ref"
          aria-label="Search refunds by refund id, order id or provider reference"
          className="h-8 w-[220px] text-[13px]"
        />
      </form>
      {query === "" ? null : (
        <FilterChip
          label="Matching"
          value={query}
          onDismiss={() => {
            setTerm("");
            setQuery("");
            setOffset(0);
          }}
        />
      )}
    </Toolbar>
  );

  return (
    <div className={DECK_PAGE}>
      {/* "Refunds", the word the section rail uses for this page. It was "SLA
          watch", so the rail said one thing and the page another; the SLA is
          what every row is measured against, and the subtitle still says so. */}
      <PageTitle subtitle="Every refund a customer was promised and has not been paid, against its SLA. Worst first.">
        Refunds
      </PageTitle>

      {actionError === null ? null : (
        <ErrorBanner
          title="That refund could not be moved"
          message={toUserMessage(actionError)}
        />
      )}

      <StageCards
        ariaLabel="Which refunds to show"
        stages={stages}
        // Unfiltered rings nothing: a ring is the card you pressed (OP-6).
        active={
          scope === "breached" ? [BREACHED] : status === ANY_STATUS ? [] : [status]
        }
        onSelect={selectStage}
        note={
          counts.data === undefined ? (
            "Reading every refund on record…"
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  changeScope("all");
                  changeStatus(ANY_STATUS);
                }}
                className="font-medium text-accent underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {formatCount(
                  Object.values(counts.data.byStatus).reduce(
                    (sum, value) => sum + value,
                    0,
                  ),
                )}{" "}
                refunds on record
              </button>
              {counts.data.byStatus.initiated === 0
                ? null
                : ` · ${formatCount(counts.data.byStatus.initiated)} raised and not yet sent`}
              {" · press a card again to clear it"}
            </>
          )
        }
      />

      <QueryState
        query={refunds}
        emptyLead={filters}
        errorTitle="The refund queue could not load"
        // A search that matches nothing says so. Without the first branch it
        // announced "every refund is inside its SLA" over a queue of six late
        // ones, because a typo had emptied the page.
        emptyTitle={
          query !== ""
            ? `Nothing matches “${query}”`
            : scope === "breached"
              ? "No breached refunds — every refund is inside its SLA"
              : "No refunds on record"
        }
        emptyDetail={
          query !== ""
            ? "The search matches a refund id, an order id or the provider's reference."
            : scope === "breached"
              ? "A refund lands here when it is past the time the customer was promised their money back and still has not completed. A failed refund counts: the money never went back."
              : "Refunds appear after a cancellation, a quality complaint or a late delivery."
        }
        isEmpty={(page) => page.items.length === 0}
        skeleton={
          <BoardSkeleton
            label="Loading the refund queue"
            note="Reading every refund on record…"
          />
        }
      >
        {(page) => {
          const rows = page.items.map((refund) => {
            const overdueHours =
              nowMs === null
                ? null
                : Math.max(0, hoursBetween(Date.parse(refund.sla_due_at), nowMs));
            return {
              refund,
              overdueHours,
              tier: refund.sla_breached ? refundTier(overdueHours ?? 0) : 0,
            };
          });

          const breached = page.items.filter((refund) => refund.sla_breached);
          const held = breached.reduce(
            (sum, refund) => sum + toNumber(refund.amount),
            0,
          );

          return (
            <>
              {filters}

              <DataTableScroll
                className={DECK_PANEL}
                footer={
                  <>
                    <TableFooter
                      shown={rows.length}
                      total={page.total}
                      noun="refunds"
                      sortedBy="how long they are past due, longest first"
                      updated={
                        <Freshness
                          at={refunds.dataUpdatedAt === 0 ? null : refunds.dataUpdatedAt}
                        />
                      }
                      extra={
                        scope === "breached"
                          ? `${formatMoneyWhole(held)} owed on this page`
                          : `${formatCount(breached.length)} of these are past SLA`
                      }
                    />
                    <Pagination
                      total={page.total}
                      limit={page.limit}
                      offset={page.offset}
                      onOffsetChange={setOffset}
                      noun="refunds"
                      className="border-t border-line"
                    />
                  </>
                }
              >
                <DataTable aria-label="Refunds, longest overdue first">
                  <DataTableHead>
                    <tr>
                      <DataTableHeaderCell className="pl-4">Refund</DataTableHeaderCell>
                      <DataTableHeaderCell>Order</DataTableHeaderCell>
                      <DataTableHeaderCell>Reason</DataTableHeaderCell>
                      <DataTableHeaderCell>State</DataTableHeaderCell>
                      <DataTableHeaderCell>Promised by</DataTableHeaderCell>
                      <DataTableHeaderCell>Overdue by</DataTableHeaderCell>
                      <DataTableHeaderCell numeric>Amount</DataTableHeaderCell>
                      <DataTableHeaderCell numeric>Move it on</DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {rows.map(({ refund, overdueHours, tier }) => {
                      const isSettled = refund.status === "completed";
                      const isBusy =
                        (retry.isPending && retry.variables === refund.id) ||
                        (settle.isPending && settle.variables === refund.id);

                      return (
                        <DataTableRow key={refund.id}>
                          <SeverityCell tier={tier} mono title={SEVERITY_LABEL[tier]}>
                            #{refund.id}
                          </SeverityCell>
                          <DataTableCell>
                            <button
                              type="button"
                              onClick={() => openOrder(refund.order_id)}
                              className="rounded-card font-mono text-[12px] text-accent underline underline-offset-2 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                              {formatOrderRef(refund.order_id)}
                            </button>
                          </DataTableCell>
                          <DataTableCell className="max-w-[180px] text-ink-2">
                            {humanizeEnum(refund.reason)}
                          </DataTableCell>
                          <DataTableCell>
                            <Badge tone={refundStatusTone(refund.status)}>
                              {humanizeEnum(refund.status)}
                            </Badge>
                          </DataTableCell>
                          <DataTableCell mono>
                            {formatDateTime(refund.sla_due_at)}
                          </DataTableCell>
                          <DataTableCell>
                            {!refund.sla_breached ? (
                              <span className="text-ok">inside SLA</span>
                            ) : overdueHours === null ? (
                              <span className="text-ink-4">—</span>
                            ) : (
                              <span className={SEVERITY_TEXT[tier]}>
                                {formatElapsed(overdueHours * MINUTES_PER_HOUR)}
                              </span>
                            )}
                          </DataTableCell>
                          <DataTableCell numeric>
                            {formatMoney(refund.amount)}
                          </DataTableCell>
                          <DataTableCell numeric>
                            <RowActions>
                              <RowAction
                                tone="accent"
                                isPending={isBusy}
                                disabled={isSettled}
                                onClick={() => retry.mutate(refund.id)}
                                title={
                                  isSettled
                                    ? "This refund already landed."
                                    : "Hand it back to the provider. It becomes processing, not settled."
                                }
                                ariaLabel={`Retry refund ${String(refund.id)}`}
                              >
                                Retry refund
                              </RowAction>
                              <RowAction
                                isPending={isBusy}
                                disabled={isSettled}
                                onClick={() => setSettling(refund)}
                                title={
                                  isSettled
                                    ? "This refund is already settled."
                                    : "Mark it settled, for money moved another way."
                                }
                                ariaLabel={`Mark refund ${String(refund.id)} settled`}
                              >
                                Mark settled…
                              </RowAction>
                            </RowActions>
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

      <SettleRefundDialog
        refund={settling}
        isPending={settle.isPending}
        onConfirm={(refundId) =>
          settle.mutate(refundId, { onSettled: () => setSettling(null) })
        }
        onClose={() => setSettling(null)}
      />
      <OrderDrawer orderId={openOrderId} onClose={() => closeOrder()} />
    </div>
  );
}
