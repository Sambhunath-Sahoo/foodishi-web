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
import type { RefundStatus } from "../../../lib/api-types";

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
  const [scope, setScope] = React.useState<Scope>("breached");
  const [status, setStatus] = React.useState<string>(ANY_STATUS);
  const [term, setTerm] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  const [openOrderId, setOpenOrderId] = React.useState<number | null>(null);

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
        setScope("breached");
        setStatus(ANY_STATUS);
        return;
      }
      setScope("all");
      setStatus((current) => (current === value ? ANY_STATUS : value));
    },
    [],
  );

  return (
    <div className={DECK_PAGE}>
      <PageTitle subtitle="Refunds the customer was promised and has not been paid. Worst first.">
        SLA watch
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
        active={
          scope === "breached"
            ? [BREACHED]
            : status === ANY_STATUS
              ? stages.map((stage) => stage.value).filter((v) => v !== BREACHED)
              : [status]
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
        errorTitle="The refund queue could not load"
        emptyTitle={
          scope === "breached"
            ? "No breached refunds — every refund is inside its SLA"
            : "No refunds on record"
        }
        emptyDetail={
          scope === "breached"
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
              <Toolbar
                ariaLabel="Refund queue filters"
                right={
                  <Freshness
                    at={refunds.dataUpdatedAt === 0 ? null : refunds.dataUpdatedAt}
                  />
                }
              >
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
                              onClick={() => setOpenOrderId(refund.order_id)}
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
                                Retry
                              </RowAction>
                              <RowAction
                                isPending={isBusy}
                                disabled={isSettled}
                                onClick={() => settle.mutate(refund.id)}
                                title={
                                  isSettled
                                    ? "This refund is already settled."
                                    : "Mark it settled, for money moved another way."
                                }
                                ariaLabel={`Mark refund ${String(refund.id)} settled`}
                              >
                                Settled
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

      <OrderDrawer orderId={openOrderId} onClose={() => setOpenOrderId(null)} />
    </div>
  );
}
