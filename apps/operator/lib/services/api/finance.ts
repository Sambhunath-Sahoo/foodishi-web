/**
 * Money, against the live API.
 *
 * The largest of the ten services and the one with the most mapping to do,
 * because two of its methods answer questions the wire does not phrase the same
 * way:
 *
 *  - `countRefunds()` wants `RefundTally` with a camelCase `byStatus`, and
 *    `GET /admin/refunds/count` answers `by_status`. That route was added FOR
 *    this method — it was the only one of the fifty-three with nothing behind
 *    it — and shaped to match the `/admin/payments/count` and
 *    `/admin/deliveries/count` that already existed.
 *
 *  - `listTransactions()` filters on a LIST of statuses, because the "Sent
 *    back" stage card folds `refunded` and `partially_refunded` into one count.
 *    `GET /admin/payments` used to take a single `status`, which left the client
 *    choosing between under-reporting and disagreeing with its own total; it now
 *    accepts a repeated parameter, so the card's count and its rows come from
 *    the same predicate.
 */
import { api } from "@repo/api-client";

import type {
  CommissionLedger,
  FinanceService,
  RefundQuery,
  RefundTally,
  TransactionQuery,
} from "../types";
import type {
  PaymentRead,
  PaymentStatus,
  RefundDetail,
  RefundRead,
  RefundStatus,
} from "../../api-types";

/** A `Page<T>` envelope as the API returns it. */
interface WirePage<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

/** `GET /admin/refunds/count`, snake_case as it arrives. */
interface WireRefundTally {
  readonly by_status: Readonly<Record<string, number>>;
  readonly breached: number;
  readonly owed: string;
}

/**
 * Every status the console can render, so a rail never has a hole in it.
 *
 * The API seeds all of them at zero, but reading through an explicit list rather
 * than trusting the response keeps the two independent: a status added on the
 * server that this console has not been taught about cannot silently appear, and
 * a status the server stops sending renders 0 rather than `undefined`, which is
 * a gap in a rail rather than a zero.
 */
const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "pending",
  "authorized",
  "captured",
  "failed",
  "refunded",
  "partially_refunded",
];

const REFUND_STATUSES: readonly RefundStatus[] = [
  "initiated",
  "processing",
  "completed",
  "failed",
];

function fillCounts<T extends string>(
  keys: readonly T[],
  raw: Readonly<Record<string, number>>,
): Readonly<Record<T, number>> {
  const filled = {} as Record<T, number>;
  for (const key of keys) filled[key] = raw[key] ?? 0;
  return filled;
}

export const apiFinance: FinanceService = {
  async countPaymentsByStatus() {
    const raw = await api.get<Record<string, number>>("/admin/payments/count");
    return fillCounts(PAYMENT_STATUSES, raw);
  },

  async countRefunds(): Promise<RefundTally> {
    const wire = await api.get<WireRefundTally>("/admin/refunds/count");
    return {
      byStatus: fillCounts(REFUND_STATUSES, wire.by_status),
      breached: wire.breached,
      // A decimal string all the way through. Parsing it here to a number would
      // be the one place money became a float in this console.
      owed: wire.owed,
    };
  },

  listTransactions(query: TransactionQuery) {
    return api.get<WirePage<PaymentRead>>("/admin/payments", {
      query: {
        // Empty search is "no filter", not "match the empty string".
        q: query.q === "" ? undefined : query.q,
        // Repeated on the wire, one `status=` per member. `undefined` for null
        // means "every status" rather than "none".
        status: query.statuses === null ? undefined : [...query.statuses],
        method: query.method === null ? undefined : query.method,
        limit: query.limit,
        offset: query.offset,
      },
    });
  },

  listPaymentsForOrder(orderId: number) {
    return api.get<WirePage<PaymentRead>>(`/orders/${String(orderId)}/payments`);
  },

  listRefunds(query: RefundQuery) {
    return api.get<WirePage<RefundDetail>>("/admin/refunds", {
      query: {
        q: query.q === "" ? undefined : query.q,
        status: query.status === null ? undefined : query.status,
        // The wire calls it `breached`. Sent only when true: `breached=false`
        // and "no breach filter" are the same request, and the shorter one
        // caches better.
        breached: query.breachedOnly ? true : undefined,
        limit: query.limit,
        offset: query.offset,
      },
    });
  },

  listRefundsForOrder(orderId: number) {
    return api.get<WirePage<RefundRead>>(`/orders/${String(orderId)}/refunds`);
  },

  retryRefund(refundId: number) {
    // Moves a FAILED refund back to PROCESSING. Platform-guarded; a 409 here is
    // the server saying the refund is not in a state that can be retried, and
    // its sentence is better than anything this layer could invent.
    return api.post<RefundDetail>(`/admin/refunds/${String(refundId)}/retry`);
  },

  completeRefund(refundId: number) {
    // NOT under /admin: `POST /refunds/{id}/complete` carries its own platform
    // guard. Stamping a refund complete is the operator saying the money landed,
    // which is why it is theirs alone and not a restaurant's.
    return api.post<RefundDetail>(`/refunds/${String(refundId)}/complete`);
  },

  getLedger(days: number) {
    return api.get<CommissionLedger>("/admin/commission", { query: { days } });
  },
};
