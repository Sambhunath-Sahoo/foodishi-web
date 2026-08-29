import type {
  Address,
  AddressCreate,
  CancelResult,
  MenuItem,
  OrderDetail,
  OrderRead,
  OrderStatusRead,
  Page,
  Payment,
  Quote,
  QuoteRequest,
} from "../../types";
import type { PaymentMethod } from "../../payment";
import { isSettled } from "../../lifecycle";
import type {
  CancelOrderCommand,
  OrdersService,
  PlaceOrderCommand,
  ValidateCouponCommand,
} from "../types";
import { fixtureCatalog } from "./catalog";
import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
  settle,
} from "./latency";
import { PricingError, buildQuote, money, toAmount } from "./pricing";
import { discountFor, findCoupon, refuseCoupon, validate } from "./coupons";

/** Stands in for the gateway webhook that captures an authorized amount. */
const CAPTURE_DELAY_MS = 4_000;
import {
  allAddresses,
  allOrders,
  appendEvent,
  eventsFor,
  findOrder,
  paymentsFor,
  putAddress,
  putOrder,
  putPayment,
  recallPlaced,
  rememberPlaced,
  replacePayments,
  takeNextOrderId,
} from "./store";


/**
 * Orders, payments and coupons over the fixture source.
 *
 * The rules here are the server's rules, not new ones: pricing mirrors
 * pricing.py, cancellation mirrors policy.py, and a payment authorizes without
 * capturing because the real provider mock does the same. Where a rule is
 * refused, the message is the sentence the customer would have received.
 */

async function itemsForRequest(
  request: QuoteRequest,
): Promise<readonly { readonly item: MenuItem; readonly quantity: number }[]> {
  const menu = await fixtureCatalog.getMenu(request.restaurant_id);
  const byId = new Map(
    menu.flatMap((category) => category.items).map((item) => [item.id, item] as const),
  );
  return request.items.map((line) => {
    const item = byId.get(line.menu_item_id);
    if (item === undefined) {
      throw new UnprocessableError(`No menu item with id ${line.menu_item_id}`);
    }
    return { item, quantity: line.quantity };
  });
}

async function priceRequest(request: QuoteRequest): Promise<Quote> {
  const [policy, lines] = await Promise.all([
    fixtureCatalog.getPolicy(request.restaurant_id),
    itemsForRequest(request),
  ]);

  const subtotal = lines.reduce(
    (sum, line) => sum + toAmount(line.item.price) * line.quantity,
    0,
  );

  let discount = 0;
  let couponMessage: string | null = null;
  let couponCode: string | null = null;
  if (request.coupon_code !== null && request.coupon_code !== undefined && request.coupon_code !== "") {
    const coupon = findCoupon(request.coupon_code);
    const refusal = refuseCoupon(coupon, subtotal);
    if (refusal !== null || coupon === null) {
      couponMessage = refusal;
    } else {
      discount = discountFor(coupon, subtotal);
      couponCode = coupon.code;
      // Left null on purpose: `coupon_message` is the reason a code could NOT
      // be applied, and the UI shows any non-empty value as a refusal.
      couponMessage = null;
    }
  }

  try {
    return buildQuote({
      restaurantId: request.restaurant_id,
      addressId: request.address_id,
      policy,
      lines,
      discount,
      couponCode,
      couponMessage,
      placedAt: new Date(),
    });
  } catch (error) {
    if (error instanceof PricingError) throw new UnprocessableError(error.message);
    throw error;
  }
}

function nextEventId(orderId: number): number {
  return eventsFor(orderId).length + 1 + orderId * 1000;
}

export const fixtureOrders: OrdersService = {
  listAddresses: (userId) =>
    settle(allAddresses().filter((address) => address.user_id === userId)),

  createAddress: (userId, payload: AddressCreate) => {
    const existing = allAddresses().filter((row) => row.user_id === userId);
    const address: Address = {
      id: Math.max(0, ...allAddresses().map((row) => row.id)) + 1,
      user_id: userId,
      label: payload.label,
      line1: payload.line1,
      line2: payload.line2 ?? null,
      city: payload.city,
      pincode: payload.pincode,
      latitude: String(payload.latitude),
      longitude: String(payload.longitude),
      // The server makes the first address on an account the default.
      is_default: existing.length === 0,
      created_at: new Date().toISOString(),
    };
    putAddress(address);
    return settle(address);
  },

  quote: async (request) => {
    const quote = await priceRequest(request);
    return settle(quote);
  },

  placeOrder: async ({
    userId,
    request,
    idempotencyKey,
    deliveryNote,
  }: PlaceOrderCommand) => {
    // A retried attempt returns the order it already created, never a second.
    const seen = recallPlaced(idempotencyKey);
    if (seen !== null) {
      const existing = findOrder(seen);
      if (existing !== null) return settle(existing);
    }

    const quote = await priceRequest(request);
    const orderId = takeNextOrderId();
    const placedAt = new Date().toISOString();

    const order: OrderDetail = {
      id: orderId,
      user_id: userId,
      restaurant_id: request.restaurant_id,
      address_id: request.address_id,
      coupon_id: null,
      status: "pending",
      subtotal: quote.subtotal,
      packaging_fee: quote.packaging_fee,
      delivery_fee: quote.delivery_fee,
      tax_amount: quote.tax_amount,
      discount_amount: quote.discount_amount,
      total_amount: quote.total_amount,
      distance_km: quote.distance_km,
      placed_at: placedAt,
      cancellable_until: quote.cancellable_until,
      promised_at: quote.promised_at,
      cancelled_at: null,
      cancellation_reason: null,
      delivered_at: null,
      delivery_note: deliveryNote,
      items: quote.lines.map((line, index) => ({
        id: orderId * 100 + index,
        menu_item_id: line.menu_item_id,
        item_name: line.item_name,
        unit_price: line.unit_price,
        quantity: line.quantity,
        line_total: line.line_total,
        notes: null,
      })),
    };

    putOrder(order);
    appendEvent(orderId, {
      id: nextEventId(orderId),
      from_status: null,
      to_status: "pending",
      actor_type: "user",
      actor_id: userId,
      reason: null,
      created_at: placedAt,
    });
    rememberPlaced(idempotencyKey, orderId);
    return settle(order);
  },

  getOrder: (orderId) => {
    const order = findOrder(orderId);
    if (order === null) {
      return Promise.reject(new NotFoundError(`No order with id ${orderId}`));
    }
    return settle(order);
  },

  getOrderStatus: (orderId) => {
    const order = findOrder(orderId);
    if (order === null) {
      return Promise.reject(new NotFoundError(`No order with id ${orderId}`));
    }
    const now = Date.now();
    const promised = new Date(order.promised_at).getTime();
    const status: OrderStatusRead = {
      id: order.id,
      status: order.status,
      promised_at: order.promised_at,
      minutes_remaining: Math.round((promised - now) / 60_000),
      is_late: !isSettled(order.status) && now > promised,
      cancellable_until: order.cancellable_until,
      // The server allows cancelling right up to hand-off, fee or no fee.
      is_cancellable:
        !isSettled(order.status) &&
        order.status !== "out_for_delivery" &&
        order.cancelled_at === null,
    };
    return settle(status);
  },

  listOrderEvents: (orderId) => settle(eventsFor(orderId)),

  listMyOrders: (limit, offset, live) => {
    const mine = allOrders().filter((order) =>
      live ? !isSettled(order.status) : true,
    );
    const page: Page<OrderRead> = {
      items: mine.slice(offset, offset + limit),
      total: mine.length,
      limit,
      offset,
    };
    return settle(page);
  },

  cancelOrder: async ({ orderId, userId, reason }: CancelOrderCommand) => {
    const order = findOrder(orderId);
    if (order === null) throw new NotFoundError(`No order with id ${orderId}`);
    if (order.status === "cancelled") {
      throw new ConflictError("That order is already cancelled");
    }
    if (isSettled(order.status)) {
      throw new UnprocessableError("A delivered order cannot be cancelled");
    }

    const policy = await fixtureCatalog.getPolicy(order.restaurant_id);
    const withinWindow = Date.now() <= new Date(order.cancellable_until).getTime();
    const captured = paymentsFor(orderId)
      .filter((payment) => payment.status === "captured")
      .reduce((sum, payment) => sum + toAmount(payment.amount), 0);

    // The fee is capped at what was actually captured — the server cannot
    // refund money it never took, and must not invent a debt either.
    const rawFee = withinWindow
      ? 0
      : (toAmount(order.total_amount) * toAmount(policy.cancellation_fee_percent)) / 100;
    const fee = Math.min(rawFee, captured);
    const refund = Math.max(captured - fee, 0);

    const cancelledAt = new Date().toISOString();
    const cancelled: OrderDetail = {
      ...order,
      status: "cancelled",
      cancelled_at: cancelledAt,
      cancellation_reason: reason === undefined || reason === "" ? null : reason,
    };
    putOrder(cancelled);
    appendEvent(orderId, {
      id: nextEventId(orderId),
      from_status: order.status,
      to_status: "cancelled",
      actor_type: "user",
      actor_id: userId,
      reason: cancelled.cancellation_reason,
      created_at: cancelledAt,
    });

    if (refund > 0) {
      replacePayments(
        orderId,
        paymentsFor(orderId).map((payment) =>
          payment.status === "captured"
            ? { ...payment, status: "refunded" as const }
            : payment,
        ),
      );
    }

    const result: CancelResult = {
      order: cancelled,
      within_window: withinWindow,
      cancellation_fee: money(fee),
      refund_amount: money(refund),
      refund_id: refund > 0 ? orderId * 10 : null,
      refund_due_at:
        refund > 0
          ? new Date(Date.now() + policy.refund_sla_hours * 3_600_000).toISOString()
          : null,
    };
    return settle(result);
  },

  listPayments: (orderId) => {
    const rows = paymentsFor(orderId);
    const page: Page<Payment> = {
      items: rows,
      total: rows.length,
      limit: 20,
      offset: 0,
    };
    return settle(page);
  },

  /**
   * Authorize, and only authorize.
   *
   * The real route creates an AUTHORIZED row and leaves the capture to
   * POST /payments/{id}/callback, which is the gateway's to call. Cash is
   * never captured at all — the rider collects it. So the fixture holds the
   * amount, then flips to `captured` on a timer to stand in for that webhook,
   * which is what lets the tracking screen's payment poll do its job.
   */
  createPayment: (orderId, method: PaymentMethod) => {
    const order = findOrder(orderId);
    if (order === null) {
      return Promise.reject(new NotFoundError(`No order with id ${orderId}`));
    }

    const open = paymentsFor(orderId).find(
      (payment) => payment.status === "pending" || payment.status === "authorized",
    );
    if (open !== undefined) {
      return Promise.reject(
        new ConflictError("A payment attempt is already open on this order"),
      );
    }

    const now = new Date().toISOString();
    const payment: Payment = {
      id: orderId * 100 + paymentsFor(orderId).length + 1,
      order_id: orderId,
      method,
      provider: method === "cod" ? "cash" : "mockpay",
      provider_ref: `${method === "cod" ? "COD" : "MP"}-${String(orderId)}-${String(
        paymentsFor(orderId).length + 1,
      )}`,
      amount: order.total_amount,
      currency: "INR",
      status: "authorized",
      authorized_at: now,
      captured_at: null,
      failed_reason: null,
      created_at: now,
    };
    putPayment(orderId, payment);

    if (method !== "cod") {
      setTimeout(() => {
        replacePayments(
          orderId,
          paymentsFor(orderId).map((row) =>
            row.id === payment.id
              ? {
                  ...row,
                  status: "captured" as const,
                  captured_at: new Date().toISOString(),
                }
              : row,
          ),
        );
      }, CAPTURE_DELAY_MS);
    }

    return settle(payment);
  },

  validateCoupon: ({ code, subtotal }: ValidateCouponCommand) =>
    settle(validate(code, toAmount(subtotal))),
};
