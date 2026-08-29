/**
 * The seed, read once and slid onto tonight's clock.
 *
 * Everything in ../data is bundled JSON in exactly the shape the FastAPI schema
 * defines, so each file is cast to its generated type rather than to a
 * hand-written mirror of it: if the schema changes and the seed does not, the
 * build says so. The only transformation applied is the anchor slide — see
 * ./clock.ts for why every timestamp moves and why they all move together.
 *
 * Read-only from here on. Everything an operator does lands in ./store.ts, on
 * top of these rows, and never edits them.
 */
import type {
  AddressRead,
  CouponRead,
  Cuisine,
  DeliveryDetail,
  DeliveryPartnerRead,
  OrderDetail,
  OrderEventRead,
  PaymentRead,
  RefundRead,
  RestaurantApplicationRow,
  RestaurantDetail,
  UserRead,
} from "../../api-types";
import type { OperatorAccount, PlatformSettings } from "../types";
import { shiftIso, shiftOptionalIso } from "./clock";

import addressesJson from "../data/addresses.json";
import applicationsJson from "../data/applications.json";
import couponsJson from "../data/coupons.json";
import cuisinesJson from "../data/cuisines.json";
import deliveriesJson from "../data/deliveries.json";
import orderEventsJson from "../data/order-events.json";
import ordersJson from "../data/orders.json";
import partnersJson from "../data/delivery-partners.json";
import paymentsJson from "../data/payments.json";
import refundsJson from "../data/refunds.json";
import restaurantsJson from "../data/restaurants.json";
import settingsJson from "../data/settings.json";
import staffJson from "../data/staff.json";
import usersJson from "../data/users.json";

/* ------------------------------------------------------- the catalogue */

/** Kitchens never carry a timestamp, so this one passes through untouched. */
export const SEED_RESTAURANTS = restaurantsJson as unknown as readonly RestaurantDetail[];

export const SEED_CUISINES = cuisinesJson as readonly Cuisine[];

export const SEED_PARTNERS = partnersJson as readonly DeliveryPartnerRead[];

/* ------------------------------------------------------------- people */

export const SEED_CUSTOMERS: readonly UserRead[] = (
  usersJson as unknown as readonly UserRead[]
).map((customer) => ({ ...customer, created_at: shiftIso(customer.created_at) }));

export const SEED_ADDRESSES: readonly AddressRead[] = (
  addressesJson as unknown as readonly AddressRead[]
).map((address) => ({ ...address, created_at: shiftIso(address.created_at) }));

/* ------------------------------------------------------------- orders */

export const SEED_ORDERS: readonly OrderDetail[] = (
  ordersJson as unknown as readonly OrderDetail[]
).map((order) => ({
  ...order,
  placed_at: shiftIso(order.placed_at),
  cancellable_until: shiftIso(order.cancellable_until),
  promised_at: shiftIso(order.promised_at),
  cancelled_at: shiftOptionalIso(order.cancelled_at),
  delivered_at: shiftOptionalIso(order.delivered_at),
}));

export const SEED_EVENTS: Readonly<Record<string, readonly OrderEventRead[]>> =
  Object.fromEntries(
    Object.entries(orderEventsJson as unknown as Record<string, OrderEventRead[]>).map(
      ([orderId, trail]) => [
        orderId,
        trail.map((event) => ({ ...event, created_at: shiftIso(event.created_at) })),
      ],
    ),
  );

export const SEED_DELIVERIES: readonly DeliveryDetail[] = (
  deliveriesJson as unknown as readonly DeliveryDetail[]
).map((delivery) => ({
  ...delivery,
  assigned_at: shiftIso(delivery.assigned_at),
  picked_up_at: shiftOptionalIso(delivery.picked_up_at),
  delivered_at: shiftOptionalIso(delivery.delivered_at),
}));

/* -------------------------------------------------------------- money */

export const SEED_PAYMENTS: readonly PaymentRead[] = (
  paymentsJson as unknown as readonly PaymentRead[]
).map((payment) => ({
  ...payment,
  created_at: shiftIso(payment.created_at),
  authorized_at: shiftOptionalIso(payment.authorized_at),
  captured_at: shiftOptionalIso(payment.captured_at),
}));

export const SEED_REFUNDS: readonly RefundRead[] = (
  refundsJson as unknown as readonly RefundRead[]
).map((refund) => ({
  ...refund,
  created_at: shiftIso(refund.created_at),
  initiated_at: shiftIso(refund.initiated_at),
  sla_due_at: shiftIso(refund.sla_due_at),
  completed_at: shiftOptionalIso(refund.completed_at),
}));

/* ------------------------------------------------------------- offers */

export const SEED_COUPONS: readonly CouponRead[] = (
  couponsJson as unknown as readonly CouponRead[]
).map((coupon) => ({
  ...coupon,
  valid_from: shiftIso(coupon.valid_from),
  valid_until: shiftIso(coupon.valid_until),
  created_at: shiftIso(coupon.created_at),
}));

/* ----------------------------------------------------------- platform */

export const SEED_SETTINGS = settingsJson as PlatformSettings;

/* ------------------------------------- restaurants asking to join */

/**
 * Three applications: two waiting and one already refused.
 *
 * The refused one is not filler. It carries a real reason, and it is the only
 * way to review the two things this queue has to get right — that an answered
 * application stays readable, and that the words an operator typed are the ones
 * the applicant is shown.
 */
export const SEED_APPLICATIONS: readonly RestaurantApplicationRow[] = (
  applicationsJson as unknown as readonly RestaurantApplicationRow[]
).map((application) => ({
  ...application,
  created_at: shiftIso(application.created_at),
  updated_at: shiftIso(application.updated_at),
  reviewed_at: shiftOptionalIso(application.reviewed_at),
}));

export const SEED_STAFF: readonly OperatorAccount[] = (
  staffJson.accounts as unknown as readonly OperatorAccount[]
).map((account) => ({ ...account, created_at: shiftIso(account.created_at) }));

/**
 * The shared sign-in phrase for the seeded operator accounts.
 *
 * NOT A SECRET AND NOT A PASSWORD. The console has no backend and no user
 * table; "signing in" matches an email against ./data/staff.json and this
 * string, and unlocks nothing but the fixture data already in the bundle. The
 * sign-in screen prints it on purpose — a development door nobody can find is a
 * wasted morning, not a security control.
 */
export const DEV_PASSPHRASE = staffJson.dev_passphrase;
