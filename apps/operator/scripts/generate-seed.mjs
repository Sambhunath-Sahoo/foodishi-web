/**
 * Writes the operator console's fixture seed — `pnpm --filter operator seed`.
 *
 * The console is UI-only today: every screen reads `lib/services/`, which reads
 * the JSON files this script emits. Those files are the committed artefact and
 * the app never regenerates them at runtime; this exists so the shape of the
 * platform (how many kitchens slip, how many refunds breach, how busy tonight
 * is) can be changed on purpose rather than by hand-editing 400 orders.
 *
 * Two rules it follows, because both matter when a real backend arrives:
 *
 *   1. Every row is exactly the shape the FastAPI schema already defines —
 *      OrderDetail, PaymentRead, RefundRead, RestaurantDetail. A fixture that
 *      drifted from the real response would move the failure from a build error
 *      to a runtime bug in one screen.
 *   2. Timestamps are absolute ISO strings anchored on ANCHOR below, and the
 *      fixture layer slides them so the anchor reads as "now" — see
 *      lib/services/fixtures/clock.ts. Nothing here knows about that; it just
 *      writes a coherent evening.
 *
 * The catalogue is not invented: the 25 kitchens, their menus and their
 * policies are the same seed the customer app renders, read from
 * apps/customer/lib/services/fixtures/data. Inventing a second set of
 * restaurant names would mean the two apps disagreed about the platform.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "lib", "services", "data");
const CATALOGUE_DIR = join(
  HERE,
  "..",
  "..",
  "customer",
  "lib",
  "services",
  "fixtures",
  "data",
);

/* ------------------------------------------------------------------ knobs */

/** The instant the whole seed is written around. See rule 2 above. */
const ANCHOR = "2026-08-21T18:30:00.000Z";

const HISTORY_DAYS = 90;
const ORDER_COUNT = 420;
const CUSTOMER_COUNT = 90;
const RIDER_COUNT = 18;

/** Orders placed inside this window are still in flight. */
const LIVE_WINDOW_MINUTES = 105;
/** …and this many of them, so the board always has work on it. */
const LIVE_ORDER_COUNT = 20;
/** Live orders deliberately stuck for hours, so lateness grades all three tiers. */
const STUCK_ORDER_COUNT = 4;

/**
 * Orders placed in the last hour and a half that have already been delivered.
 *
 * Without them the console's "today" figures are whatever happens to have been
 * placed since local midnight — and because the whole seed slides so the anchor
 * reads as now (see fixtures/clock.ts), opening the console at 01:00 leaves that
 * window holding nothing but the live board. Revenue today would read zero
 * beside twenty-six orders placed today, which is coherent and looks broken.
 *
 * These are drawn from the fast kitchens only, so an order placed fifty minutes
 * ago being handed over already is the truth rather than a rounding of it.
 */
const RECENT_DELIVERED_COUNT = 12;

/** A kitchen that can plausibly cook and deliver inside this many minutes. */
const FAST_KITCHEN_MINUTES = 45;
/** …over a hop this short. */
const FAST_KITCHEN_KM = 4;

/** Platform tax on food and packaging, in percent. Mirrors settings.json. */
const GST_PERCENT = 5;
/** Foodishi's default cut of a delivered order's food value, in percent. */
const DEFAULT_COMMISSION_PERCENT = 18;

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/** Rider speed used to turn a distance into a ride, in km/h. */
const RIDE_KMH = 22;

/**
 * What the platform adds to prep plus the ride when it promises a time.
 *
 * The slack is what makes a promise keepable: a kitchen that hits its own prep
 * time and a rider who does not hit traffic arrive inside it. Everything late in
 * this seed is late because a kitchen slipped past this, which is the story the
 * console is built to tell.
 */
const PROMISE_SLACK_MINUTES = 12;

/**
 * The longest a refund is left unsettled.
 *
 * The order history runs HISTORY_DAYS, so drawing refund outcomes purely from
 * the order's age let a "failed" refund sit two months past its promise. Three
 * weeks is already a bad backlog; sixty-four days is a story about a company
 * that no longer exists. See drawRefundStatus.
 */
const REFUND_BACKLOG_DAYS = 21;

/* ------------------------------------------------------- deterministic rng */

/**
 * mulberry32. Seeded on purpose: a seed that changed on every run would mean
 * every screenshot, every "22 breached refunds" in a comment and every review
 * of this data described a platform that no longer exists.
 */
function makeRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state);
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn;
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4294967296;
  };
}

const random = makeRandom(20260821);

/** Integer in [min, max]. */
function between(min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

function pick(values) {
  return values[Math.floor(random() * values.length)];
}

/** True with probability `chance`. */
function chanceOf(chance) {
  return random() < chance;
}

/** A few of `values`, no repeats, in the order they were drawn. */
function pickSome(values, count) {
  const pool = [...values];
  const drawn = [];
  for (let taken = 0; taken < count && pool.length > 0; taken += 1) {
    drawn.push(...pool.splice(Math.floor(random() * pool.length), 1));
  }
  return drawn;
}

/* ------------------------------------------------------------------- money */

/**
 * Money is counted in paise and only ever formatted at the edge, so no rupee
 * amount is ever touched by a float. The API sends decimal strings; so do we.
 */
function paise(decimalString) {
  return Math.round(Number.parseFloat(decimalString) * 100);
}

function rupees(paiseValue) {
  return (paiseValue / 100).toFixed(2);
}

function percentOf(paiseValue, percent) {
  return Math.round((paiseValue * percent) / 100);
}

/* ------------------------------------------------------------------- clock */

const ANCHOR_MS = Date.parse(ANCHOR);

function iso(ms) {
  return new Date(ms).toISOString();
}

/** Minutes before the anchor, as an instant. */
function minutesBeforeAnchor(minutes) {
  return ANCHOR_MS - minutes * MS_PER_MINUTE;
}

/* ------------------------------------------------------------- catalogue in */

function readCatalogue(name) {
  try {
    return JSON.parse(readFileSync(join(CATALOGUE_DIR, name), "utf8"));
  } catch (cause) {
    throw new Error(
      `Could not read the shared catalogue file ${name}. This script builds the ` +
        `operator seed on top of the customer app's fixtures, so ` +
        `${CATALOGUE_DIR} has to be present.`,
      { cause },
    );
  }
}

const restaurantDetails = readCatalogue("restaurant-details.json");
const menus = readCatalogue("menus.json");
const cuisines = readCatalogue("cuisines.json");

/** RestaurantDetail[], id order. The console's catalogue, verbatim. */
const restaurants = Object.values(restaurantDetails).sort((a, b) => a.id - b.id);

/**
 * Two kitchens are switched off, because "activate/deactivate a restaurant" is
 * a screen that has to have something to show in both states.
 */
const DEACTIVATED_RESTAURANT_IDS = new Set([23, 14]);
for (const restaurant of restaurants) {
  restaurant.is_active = !DEACTIVATED_RESTAURANT_IDS.has(restaurant.id);
}

/** id -> every orderable dish, flattened out of the menu's categories. */
const dishesByRestaurant = new Map(
  restaurants.map((restaurant) => [
    restaurant.id,
    (menus[String(restaurant.id)] ?? [])
      .flatMap((category) => category.items ?? [])
      .filter((item) => item.is_available !== false),
  ]),
);

/**
 * How much longer than the honest journey — its own declared prep, plus the ride
 * — a kitchen really takes.
 *
 * This is the one number the overview and the restaurant board are built to
 * expose, so it is spread deliberately: most kitchens lose a handful of minutes
 * to the pass, and four are badly out. Those four are why "declared prep" and
 * "really takes" are two columns and not one.
 *
 * It is *slippage*, not the whole overhead, which matters: the promise the
 * customer is given already allows for the ride and PROMISE_SLACK_MINUTES on
 * top, so a kitchen slipping less than that is delivering on time. Modelling the
 * overhead as if the promise did not allow for the ride made 93% of delivered
 * orders late, which is not a platform anybody would still be running.
 */
const SLIPPAGE_MINUTES = new Map([
  [1, 5], [2, 3], [3, 7], [4, 34], [5, 4],
  [6, 2], [7, 1], [8, 6], [9, 28], [10, 3],
  [11, 6], [12, 25], [13, 5], [14, 3], [15, 2],
  [16, 4], [17, 8], [18, 3], [19, 9], [20, 38],
  [21, 6], [22, 2], [23, 5], [24, 7], [25, 3],
]);

function slippageFor(restaurantId) {
  return SLIPPAGE_MINUTES.get(restaurantId) ?? 5;
}

/** A short hop, for judging which kitchens could deliver inside the fast window. */
const FAST_HOP_MINUTES = 11;

/** Kitchens whose whole journey fits inside FAST_KITCHEN_MINUTES. */
const FAST_RESTAURANTS = restaurants.filter(
  (restaurant) =>
    restaurant.avg_prep_minutes + slippageFor(restaurant.id) + FAST_HOP_MINUTES <=
    FAST_KITCHEN_MINUTES,
);

function policyFor(restaurant) {
  return (
    restaurant.policy ?? {
      cancellation_window_mins: 5,
      cancellation_fee_percent: "10.00",
      refund_sla_hours: 24,
      delivery_fee_base: "25.00",
      delivery_fee_per_km: "5.00",
      free_delivery_above: null,
      packaging_fee: "20.00",
      min_order_value: "79.00",
      max_delivery_distance_km: "12.0",
    }
  );
}

/* --------------------------------------------------------------- customers */

const FIRST_NAMES = [
  "Aarav", "Aditi", "Ananya", "Arjun", "Bhavna", "Chetan", "Deepak", "Divya",
  "Farhan", "Gauri", "Harsha", "Ishaan", "Jyoti", "Kabir", "Kavya", "Lakshmi",
  "Manish", "Meera", "Nikhil", "Nisha", "Omkar", "Pooja", "Pranav", "Priya",
  "Rahul", "Rajesh", "Rekha", "Rohan", "Sanjana", "Shreya", "Siddharth",
  "Sneha", "Tanvi", "Tarun", "Uday", "Vandana", "Varun", "Vikram", "Yash",
  "Zoya",
];

const LAST_NAMES = [
  "Agarwal", "Bhat", "Chandra", "Desai", "Gupta", "Iyer", "Joshi", "Kulkarni",
  "Menon", "Nair", "Patel", "Pillai", "Rao", "Reddy", "Sharma", "Shetty",
  "Singh", "Verma",
];

const CITIES = ["Bengaluru", "Hyderabad", "Pune"];

const AREAS_BY_CITY = {
  Bengaluru: ["Koramangala", "Indiranagar", "Jayanagar", "HSR Layout", "Whitefield"],
  Hyderabad: ["Banjara Hills", "Gachibowli", "Jubilee Hills", "Madhapur"],
  Pune: ["Koregaon Park", "Baner", "Viman Nagar"],
};

const AVATAR_BASE =
  "https://zqntdarrnhwjwdqzekrp.supabase.co/storage/v1/object/public/menu-images/avatars";
const AVATAR_COUNT = 8;

const ADDRESS_LABELS = ["Home", "Work", "Parents", "Flatmate's", "Weekend flat"];

function makeCustomers() {
  const customers = [];
  const usedEmails = new Set();

  for (let index = 0; index < CUSTOMER_COUNT; index += 1) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const id = index + 1;
    let email = `${first}.${last}${between(10, 99)}@example.com`.toLowerCase();
    while (usedEmails.has(email)) {
      email = `${first}.${last}${between(100, 999)}@example.com`.toLowerCase();
    }
    usedEmails.add(email);

    customers.push({
      id,
      name: `${first} ${last}`,
      email,
      phone: `9${between(100000000, 999999999)}`,
      city: pick(CITIES),
      // Seven accounts are switched off, so "deactivate a customer" has both
      // states on screen and the directory's filter has something to filter.
      is_active: !(id % 13 === 0),
      avatar_url: chanceOf(0.55)
        ? `${AVATAR_BASE}/avatar-${between(1, AVATAR_COUNT)}.jpg`
        : null,
      // Registered somewhere in the two years before the seed, oldest ids first.
      created_at: iso(
        ANCHOR_MS -
          Math.round(((CUSTOMER_COUNT - index) / CUSTOMER_COUNT) * 640 * MS_PER_DAY) -
          between(0, 12) * MS_PER_HOUR,
      ),
    });
  }

  return customers;
}

const customers = makeCustomers();

function makeAddresses() {
  const addresses = [];
  let nextId = 1;

  for (const customer of customers) {
    const count = between(1, 3);
    const areas = AREAS_BY_CITY[customer.city];
    for (let index = 0; index < count; index += 1) {
      addresses.push({
        id: nextId,
        user_id: customer.id,
        label: ADDRESS_LABELS[index] ?? `Address ${index + 1}`,
        line1: `${between(1, 240)}, ${pick(areas)} ${pick(["Main Road", "Cross", "Layout", "Avenue"])}`,
        line2: chanceOf(0.5) ? `Flat ${between(1, 12)}${pick(["A", "B", "C"])}` : null,
        city: customer.city,
        pincode: `5${between(60001, 60100)}`,
        latitude: (12.8 + random() * 0.4).toFixed(6),
        longitude: (77.5 + random() * 0.3).toFixed(6),
        is_default: index === 0,
        created_at: customer.created_at,
      });
      nextId += 1;
    }
  }

  return addresses;
}

const addresses = makeAddresses();
const addressesByUser = new Map();
for (const address of addresses) {
  const existing = addressesByUser.get(address.user_id) ?? [];
  existing.push(address);
  addressesByUser.set(address.user_id, existing);
}

/* ----------------------------------------------------------------- riders */

const VEHICLES = ["bike", "scooter", "bicycle", "electric_scooter"];

function makeRiders() {
  return Array.from({ length: RIDER_COUNT }, (_, index) => ({
    id: index + 1,
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    phone: `8${between(100000000, 999999999)}`,
    vehicle_type: index < 12 ? pick(VEHICLES.slice(0, 2)) : pick(VEHICLES),
    is_available: chanceOf(0.65),
  }));
}

const riders = makeRiders();

/* ---------------------------------------------------------------- coupons */

/**
 * Nine live codes and five that are not, because the offers screen has to show
 * an exhausted code, an expired one and a switched-off one — a table where
 * every row is healthy teaches the reader nothing about the ones that are not.
 */
const COUPON_SPECS = [
  {
    code: "FOODISHI50", description: "₹50 off orders over ₹300",
    discount_type: "flat", discount_value: "50.00", max_discount_amount: null,
    min_order_value: "300.00", scope: "global", restaurant_id: null, cuisine_id: null,
    from_days: -120, until_days: 45, usage_limit_total: 5000, usage_limit_per_user: 3,
    times_used: 3184, is_active: true,
  },
  {
    code: "FIRST20", description: "20% off your first order, up to ₹120",
    discount_type: "percent", discount_value: "20.00", max_discount_amount: "120.00",
    min_order_value: "249.00", scope: "global", restaurant_id: null, cuisine_id: null,
    from_days: -300, until_days: 120, usage_limit_total: null, usage_limit_per_user: 1,
    times_used: 1962, is_active: true,
  },
  {
    code: "BIRYANI15", description: "15% off biryani, up to ₹100",
    discount_type: "percent", discount_value: "15.00", max_discount_amount: "100.00",
    min_order_value: "399.00", scope: "cuisine", restaurant_id: null, cuisine_id: 4,
    from_days: -60, until_days: 22, usage_limit_total: 2000, usage_limit_per_user: 2,
    times_used: 1934, is_active: true,
  },
  {
    code: "PARADISE100", description: "₹100 off at Paradise Biryani House",
    discount_type: "flat", discount_value: "100.00", max_discount_amount: null,
    min_order_value: "699.00", scope: "restaurant", restaurant_id: 4, cuisine_id: null,
    from_days: -30, until_days: 14, usage_limit_total: 600, usage_limit_per_user: 2,
    times_used: 600, is_active: true,
  },
  {
    code: "WEEKNIGHT", description: "₹75 off Monday to Thursday",
    discount_type: "flat", discount_value: "75.00", max_discount_amount: null,
    min_order_value: "449.00", scope: "global", restaurant_id: null, cuisine_id: null,
    from_days: -45, until_days: 30, usage_limit_total: 4000, usage_limit_per_user: 4,
    times_used: 1471, is_active: true,
  },
  {
    code: "SOUTHERN10", description: "10% off South Indian, up to ₹80",
    discount_type: "percent", discount_value: "10.00", max_discount_amount: "80.00",
    min_order_value: "199.00", scope: "cuisine", restaurant_id: null, cuisine_id: 2,
    from_days: -75, until_days: 60, usage_limit_total: 3000, usage_limit_per_user: 5,
    times_used: 908, is_active: true,
  },
  {
    code: "DESSERT60", description: "₹60 off at The Dessert Room",
    discount_type: "flat", discount_value: "60.00", max_discount_amount: null,
    min_order_value: "349.00", scope: "restaurant", restaurant_id: 14, cuisine_id: null,
    from_days: -20, until_days: 10, usage_limit_total: 400, usage_limit_per_user: 2,
    times_used: 371, is_active: true,
  },
  {
    code: "LATENIGHT", description: "₹40 off after 22:00",
    discount_type: "flat", discount_value: "40.00", max_discount_amount: null,
    min_order_value: "249.00", scope: "global", restaurant_id: null, cuisine_id: null,
    from_days: -14, until_days: 76, usage_limit_total: 2500, usage_limit_per_user: 6,
    times_used: 214, is_active: true,
  },
  {
    code: "TIFFIN25", description: "25% off breakfast, up to ₹60",
    discount_type: "percent", discount_value: "25.00", max_discount_amount: "60.00",
    min_order_value: "149.00", scope: "restaurant", restaurant_id: 18, cuisine_id: null,
    from_days: -8, until_days: 52, usage_limit_total: 1200, usage_limit_per_user: 3,
    times_used: 96, is_active: true,
  },
  {
    code: "MONSOON30", description: "30% off, up to ₹150",
    discount_type: "percent", discount_value: "30.00", max_discount_amount: "150.00",
    min_order_value: "499.00", scope: "global", restaurant_id: null, cuisine_id: null,
    from_days: -160, until_days: -40, usage_limit_total: 3000, usage_limit_per_user: 2,
    times_used: 2874, is_active: true,
  },
  {
    code: "PIZZA199", description: "₹199 off two pizzas",
    discount_type: "flat", discount_value: "199.00", max_discount_amount: null,
    min_order_value: "899.00", scope: "cuisine", restaurant_id: null, cuisine_id: 5,
    from_days: -95, until_days: -12, usage_limit_total: 800, usage_limit_per_user: 1,
    times_used: 612, is_active: true,
  },
  {
    code: "WELCOME150", description: "₹150 off your first three orders",
    discount_type: "flat", discount_value: "150.00", max_discount_amount: null,
    min_order_value: "599.00", scope: "global", restaurant_id: null, cuisine_id: null,
    from_days: -210, until_days: 90, usage_limit_total: 1500, usage_limit_per_user: 3,
    times_used: 1500, is_active: true,
  },
  {
    code: "STAFFTEST", description: "Internal test code — not for customers",
    discount_type: "flat", discount_value: "500.00", max_discount_amount: null,
    min_order_value: "0.00", scope: "global", restaurant_id: null, cuisine_id: null,
    from_days: -400, until_days: 400, usage_limit_total: 50, usage_limit_per_user: 50,
    times_used: 11, is_active: false,
  },
  {
    code: "CHINESE20", description: "20% off Chinese, up to ₹110",
    discount_type: "percent", discount_value: "20.00", max_discount_amount: "110.00",
    min_order_value: "349.00", scope: "cuisine", restaurant_id: null, cuisine_id: 3,
    from_days: -40, until_days: 4, usage_limit_total: 1000, usage_limit_per_user: 2,
    times_used: 947, is_active: true,
  },
];

const coupons = COUPON_SPECS.map((spec, index) => ({
  id: index + 1,
  code: spec.code,
  description: spec.description,
  discount_type: spec.discount_type,
  discount_value: spec.discount_value,
  max_discount_amount: spec.max_discount_amount,
  min_order_value: spec.min_order_value,
  scope: spec.scope,
  restaurant_id: spec.restaurant_id,
  cuisine_id: spec.cuisine_id,
  valid_from: iso(ANCHOR_MS + spec.from_days * MS_PER_DAY),
  valid_until: iso(ANCHOR_MS + spec.until_days * MS_PER_DAY),
  usage_limit_total: spec.usage_limit_total,
  usage_limit_per_user: spec.usage_limit_per_user,
  times_used: spec.times_used,
  is_active: spec.is_active,
  created_at: iso(ANCHOR_MS + (spec.from_days - 2) * MS_PER_DAY),
}));

/** Codes a customer could actually have used on an order at `placedMs`. */
function redeemableCoupons(placedMs, restaurantId) {
  return coupons.filter((coupon) => {
    if (!coupon.is_active) return false;
    if (placedMs < Date.parse(coupon.valid_from)) return false;
    if (placedMs > Date.parse(coupon.valid_until)) return false;
    if (coupon.scope === "restaurant") return coupon.restaurant_id === restaurantId;
    return true;
  });
}

/* ----------------------------------------------------------------- orders */

/**
 * What a customer types into "any instructions for the rider".
 *
 * Most orders have none — a note on every order would make the column on the
 * operator's board meaningless. The ones that do are the reason the field
 * exists: an operator triaging a late delivery needs to see "leave it with
 * security" without opening the ticket.
 */
const DELIVERY_NOTES = [
  "Leave it at the gate",
  "Leave with security, flat is on the 4th floor",
  "Please call on arrival, doorbell is broken",
  "Second gate, not the main one",
  "No contact delivery please",
  "Ring twice — baby sleeping",
  "Hand it to the guard at the tower entrance",
];

const CANCELLATION_REASONS = [
  "Customer changed their mind",
  "Ordered by mistake",
  "Kitchen could not take the order",
  "Item out of stock",
  "Address outside the delivery radius",
  "No rider available",
  "Duplicate order",
];

const PAYMENT_METHODS = [
  ...Array.from({ length: 9 }, () => "upi"),
  ...Array.from({ length: 4 }, () => "card"),
  ...Array.from({ length: 2 }, () => "wallet"),
  "netbanking",
  ...Array.from({ length: 4 }, () => "cod"),
];

const FAILURE_REASONS = [
  "Insufficient funds",
  "Card declined by the issuing bank",
  "UPI collect request expired",
  "Payment gateway timed out",
  "Bank server unavailable",
  "3D Secure authentication failed",
];

/**
 * How busy each of the last 90 days was.
 *
 * Steeply, deliberately: the platform is three months old and growing fast, so
 * the recent days carry most of the orders. That is not decoration — it is what
 * makes the seed internally consistent. Thirty-odd orders in the last two hours
 * only makes sense on a platform doing a dozen a day and rising, and a flat
 * curve would have every chart in the console showing a straight line that
 * suddenly spikes today for no reason a reader could explain.
 *
 * Friday and Saturday get a further bump, because they are the two days an
 * operations console is actually staffed for.
 */
const GROWTH_STEEPNESS = 20;
const GROWTH_CURVE = 3;
const WEEKEND_BUMP = 1.5;

function dayWeight(daysAgo) {
  const recency = (HISTORY_DAYS - daysAgo) / HISTORY_DAYS;
  const growth = 1 + GROWTH_STEEPNESS * recency ** GROWTH_CURVE;
  const dayOfWeek = new Date(ANCHOR_MS - daysAgo * MS_PER_DAY).getUTCDay();
  const weekend = dayOfWeek === 5 || dayOfWeek === 6 ? WEEKEND_BUMP : 1;
  return growth * weekend;
}

/** Which day a historic order was placed on, weighted by the curve above. */
function drawDaysAgo() {
  const weights = Array.from({ length: HISTORY_DAYS }, (_, daysAgo) =>
    dayWeight(daysAgo),
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let target = random() * total;
  for (let daysAgo = 0; daysAgo < weights.length; daysAgo += 1) {
    target -= weights[daysAgo];
    if (target <= 0) return daysAgo;
  }
  return weights.length - 1;
}

/** A meal-time hour, so the daily rhythm is lunch and dinner, not noise. */
function drawHour() {
  return chanceOf(0.42) ? between(11, 14) : chanceOf(0.75) ? between(18, 22) : between(7, 23);
}

function buildItems(restaurant, orderId, nextItemId) {
  const dishes = dishesByRestaurant.get(restaurant.id) ?? [];
  const chosen = pickSome(dishes, Math.min(dishes.length, between(1, 4)));
  const items = chosen.map((dish, index) => {
    const quantity = chanceOf(0.72) ? 1 : between(2, 3);
    const unit = paise(dish.price);
    return {
      id: nextItemId + index,
      menu_item_id: dish.id,
      item_name: dish.name,
      unit_price: rupees(unit),
      quantity,
      line_total: rupees(unit * quantity),
      notes: chanceOf(0.12)
        ? pick(["Less spicy please", "No onion", "Extra chutney", "Pack cutlery"])
        : null,
    };
  });
  return items.length > 0
    ? items
    : [
        {
          id: nextItemId,
          menu_item_id: 0,
          item_name: "Chef's special",
          unit_price: "249.00",
          quantity: 1,
          line_total: "249.00",
          notes: null,
        },
      ];
}

function discountFor(coupon, subtotalPaise) {
  if (coupon === null) return 0;
  if (paise(coupon.min_order_value) > subtotalPaise) return 0;
  if (coupon.discount_type === "flat") {
    return Math.min(paise(coupon.discount_value), subtotalPaise);
  }
  const raw = percentOf(subtotalPaise, Number.parseFloat(coupon.discount_value));
  const capped =
    coupon.max_discount_amount === null
      ? raw
      : Math.min(raw, paise(coupon.max_discount_amount));
  return Math.min(capped, subtotalPaise);
}

const orders = [];
const orderEvents = {};
const deliveries = [];
const payments = [];
const refunds = [];

let nextItemId = 1;
let nextEventId = 1;
let nextDeliveryId = 1;
let nextPaymentId = 1;
let nextRefundId = 1;

function addEvent(orderId, fromStatus, toStatus, atMs, actorType, actorId, reason) {
  const trail = orderEvents[String(orderId)] ?? [];
  trail.push({
    id: nextEventId,
    from_status: fromStatus,
    to_status: toStatus,
    actor_type: actorType,
    actor_id: actorId,
    reason: reason ?? null,
    created_at: iso(atMs),
  });
  nextEventId += 1;
  orderEvents[String(orderId)] = trail;
}

/**
 * One order, and everything hanging off it: its items, its status trail, its
 * delivery, its payments and any refund. They are written together because
 * they have to agree — a refund on an order with no captured payment, or a
 * delivered order with no delivery row, is data no screen can explain.
 */
function buildOrder(orderId, plan) {
  const restaurant = plan.restaurant;
  const customer = plan.customer;
  const policy = policyFor(restaurant);
  const placedMs = plan.placedMs;

  const items = buildItems(restaurant, orderId, nextItemId);
  nextItemId += items.length;

  const subtotal = items.reduce((sum, item) => sum + paise(item.line_total), 0);
  const distanceKm = Number.parseFloat(
    plan.isFast
      ? (0.8 + random() * (FAST_KITCHEN_KM - 0.8)).toFixed(1)
      : (0.8 + random() * 11.5).toFixed(1),
  );
  const packaging = paise(policy.packaging_fee);
  const freeAbove =
    policy.free_delivery_above === null ? null : paise(policy.free_delivery_above);
  const delivery =
    freeAbove !== null && subtotal >= freeAbove
      ? 0
      : paise(policy.delivery_fee_base) +
        Math.round(paise(policy.delivery_fee_per_km) * distanceKm);

  const candidates = redeemableCoupons(placedMs, restaurant.id);
  const coupon = candidates.length > 0 && chanceOf(0.3) ? pick(candidates) : null;
  const discount = discountFor(coupon, subtotal);
  const tax = percentOf(subtotal + packaging, GST_PERCENT);
  const total = Math.max(0, subtotal + packaging + delivery + tax - discount);

  const rideMinutes = Math.max(6, Math.round((distanceKm / RIDE_KMH) * 60));
  const promisedMs =
    placedMs +
    (restaurant.avg_prep_minutes + rideMinutes + PROMISE_SLACK_MINUTES) * MS_PER_MINUTE;
  const cancellableUntilMs = placedMs + policy.cancellation_window_mins * MS_PER_MINUTE;

  const order = {
    id: orderId,
    user_id: customer.id,
    restaurant_id: restaurant.id,
    address_id: plan.addressId,
    coupon_id: coupon === null ? null : coupon.id,
    status: plan.status,
    subtotal: rupees(subtotal),
    packaging_fee: rupees(packaging),
    delivery_fee: rupees(delivery),
    tax_amount: rupees(tax),
    discount_amount: rupees(discount),
    total_amount: rupees(total),
    distance_km: distanceKm.toFixed(1),
    placed_at: iso(placedMs),
    cancellable_until: iso(cancellableUntilMs),
    promised_at: iso(promisedMs),
    cancelled_at: null,
    cancellation_reason: null,
    // Nullable and usually null: this is the customer's own instruction to the
    // rider, and most people do not leave one.
    delivery_note: chanceOf(0.18) ? pick(DELIVERY_NOTES) : null,
    delivered_at: null,
    items,
  };

  addEvent(orderId, null, "pending", placedMs, "user", customer.id, null);

  /* --- how far the order actually got ---------------------------------- */

  const path = ["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery"];
  const reachedIndex =
    plan.status === "delivered" || plan.status === "cancelled"
      ? plan.status === "delivered"
        ? path.length - 1
        : between(0, 3)
      : path.indexOf(plan.status);

  // Every state change between placed and now, spread over the real interval
  // rather than stamped at one instant.
  const modelledEndMs =
    placedMs +
    (restaurant.avg_prep_minutes +
      rideMinutes +
      slippageFor(restaurant.id) +
      between(-5, 9)) *
      MS_PER_MINUTE;

  // A delivered order cannot be handed over in the future, however slow the
  // kitchen's model says it is. The clamp only ever bites on the most recent
  // rows, and being a few minutes optimistic there beats a delivery timestamp
  // the console would render as tomorrow.
  const endMs =
    plan.status === "delivered"
      ? Math.min(modelledEndMs, ANCHOR_MS - MS_PER_MINUTE)
      : Math.min(ANCHOR_MS, promisedMs);

  const stepMs = Math.max(
    2 * MS_PER_MINUTE,
    Math.round((endMs - placedMs) / Math.max(1, reachedIndex + 1)),
  );

  let previous = "pending";
  for (let step = 1; step <= reachedIndex; step += 1) {
    const status = path[step];
    const actorType = step <= 3 ? "restaurant" : "system";
    addEvent(
      orderId,
      previous,
      status,
      placedMs + step * stepMs,
      actorType,
      actorType === "restaurant" ? restaurant.id : null,
      null,
    );
    previous = status;
  }

  if (plan.status === "delivered") {
    order.delivered_at = iso(endMs);
    addEvent(orderId, previous, "delivered", endMs, "system", null, null);
  }

  if (plan.status === "cancelled") {
    const cancelledMs = Math.min(
      endMs,
      placedMs + between(1, Math.max(2, restaurant.avg_prep_minutes)) * MS_PER_MINUTE,
    );
    const byRestaurant = chanceOf(0.35);
    order.cancelled_at = iso(cancelledMs);
    order.cancellation_reason = byRestaurant
      ? pick(CANCELLATION_REASONS.slice(2))
      : pick(CANCELLATION_REASONS.slice(0, 2));
    addEvent(
      orderId,
      previous,
      "cancelled",
      cancelledMs,
      byRestaurant ? "restaurant" : "user",
      byRestaurant ? restaurant.id : customer.id,
      order.cancellation_reason,
    );
  }

  /* --- the ride -------------------------------------------------------- */

  // A cancelled order that got as far as the pass still had a rider sent to
  // it, and that ride ends as a failure rather than quietly not existing —
  // "handle a failed delivery" is a job with no rows behind it otherwise.
  const cancelledAfterPickup = plan.status === "cancelled" && reachedIndex >= 3;

  const hasRider =
    (plan.status === "delivered" ||
      plan.status === "out_for_delivery" ||
      cancelledAfterPickup ||
      (plan.status === "ready_for_pickup" && chanceOf(0.8))) &&
    !plan.riderWithheld;

  if (hasRider) {
    const rider = pick(riders);
    const assignedMs = placedMs + Math.round(stepMs * Math.max(1, reachedIndex - 0.5));
    const pickedUpMs =
      plan.status === "delivered" || plan.status === "out_for_delivery"
        ? assignedMs + between(2, 9) * MS_PER_MINUTE
        : null;
    const failed = cancelledAfterPickup || plan.deliveryFailed === true;

    deliveries.push({
      id: nextDeliveryId,
      order_id: orderId,
      partner_id: rider.id,
      distance_km: distanceKm.toFixed(1),
      eta_minutes: rideMinutes,
      status:
        plan.status === "delivered"
          ? "delivered"
          : failed
            ? "failed"
            : pickedUpMs === null
              ? "assigned"
              : "picked_up",
      assigned_at: iso(assignedMs),
      picked_up_at: pickedUpMs === null ? null : iso(pickedUpMs),
      delivered_at: plan.status === "delivered" ? iso(endMs) : null,
      partner: rider,
    });
    nextDeliveryId += 1;
  }

  /* --- money in -------------------------------------------------------- */

  const method = plan.method;
  const isCod = method === "cod";
  const provider = isCod ? "cash" : pick(["razorpay", "payu", "cashfree"]);

  function providerRef() {
    return isCod
      ? null
      : `pay_${Math.floor(random() * 0xffffffff).toString(16).padStart(8, "0")}${orderId}`;
  }

  // A failed attempt, then the one that worked. This is where the payment
  // failures view gets its rows, and why an order can have two payments.
  if (plan.failedAttempts > 0) {
    for (let attempt = 0; attempt < plan.failedAttempts; attempt += 1) {
      payments.push({
        id: nextPaymentId,
        order_id: orderId,
        method: isCod ? "upi" : method,
        provider: isCod ? pick(["razorpay", "payu"]) : provider,
        provider_ref: `pay_${Math.floor(random() * 0xffffffff).toString(16)}`,
        amount: rupees(total),
        currency: "INR",
        status: "failed",
        authorized_at: null,
        captured_at: null,
        failed_reason: pick(FAILURE_REASONS),
        created_at: iso(placedMs + attempt * MS_PER_MINUTE),
      });
      nextPaymentId += 1;
    }
  }

  const paymentId = nextPaymentId;
  if (!plan.paymentStuck) {
    const authorizedMs = placedMs + between(1, 3) * MS_PER_MINUTE;
    const capturedMs = isCod ? endMs : authorizedMs;
    const settled = plan.status === "delivered" || (!isCod && plan.status !== "pending");

    payments.push({
      id: paymentId,
      order_id: orderId,
      method,
      provider,
      provider_ref: providerRef(),
      amount: rupees(total),
      currency: "INR",
      status: plan.paymentStatus,
      authorized_at: isCod || !settled ? null : iso(authorizedMs),
      captured_at: plan.paymentStatus === "pending" ? null : iso(capturedMs),
      failed_reason: null,
      created_at: iso(placedMs + MS_PER_MINUTE),
    });
    nextPaymentId += 1;
  }

  /* --- money back ------------------------------------------------------ */

  if (plan.refund !== null && !plan.paymentStuck) {
    const initiatedMs =
      (plan.status === "cancelled" ? Date.parse(order.cancelled_at) : endMs) +
      between(3, 40) * MS_PER_MINUTE;
    const slaDueMs = initiatedMs + policy.refund_sla_hours * MS_PER_HOUR;
    const isPartial = plan.refund.partial;
    const amount = isPartial ? Math.round(total * 0.6) : total;

    refunds.push({
      id: nextRefundId,
      order_id: orderId,
      payment_id: paymentId,
      amount: rupees(amount),
      reason: plan.refund.reason,
      status: plan.refund.status,
      sla_due_at: iso(slaDueMs),
      initiated_at: iso(initiatedMs),
      completed_at:
        plan.refund.status === "completed"
          ? iso(initiatedMs + between(1, 30) * MS_PER_HOUR)
          : null,
      provider_ref:
        plan.refund.status === "initiated"
          ? null
          : `rfnd_${Math.floor(random() * 0xffffffff).toString(16)}`,
      created_at: iso(initiatedMs),
    });
    nextRefundId += 1;
  }

  return order;
}

/**
 * What state an order in flight is in.
 *
 * Weighted so that roughly half of the board is at or past the pass. That is
 * what gives the deliveries board rides to show: a live wave that was almost all
 * "preparing" would leave the busiest screen in the Operations group with three
 * rows on it, which says nothing about a platform with two dozen orders out.
 */
function drawLiveStatus() {
  const roll = random();
  if (roll < 0.06) return "pending";
  if (roll < 0.2) return "confirmed";
  if (roll < 0.46) return "preparing";
  if (roll < 0.73) return "ready_for_pickup";
  return "out_for_delivery";
}

/**
 * The refund on an order, or null.
 *
 * Anything raised more than three days ago has had time to settle, so it is
 * completed; recent ones are still moving, and a handful are stuck past their
 * SLA. That is what the SLA watch exists to show, and it is the only reason
 * these statuses are not uniform.
 */
function drawRefund(status, initiatedDaysAgo) {
  if (status === "cancelled") {
    const reason = chanceOf(0.6)
      ? "cancelled_by_user"
      : chanceOf(0.5)
        ? "cancelled_by_restaurant"
        : "item_unavailable";
    return { reason, status: drawRefundStatus(initiatedDaysAgo), partial: chanceOf(0.18) };
  }
  if (status === "delivered" && chanceOf(0.035)) {
    return {
      reason: chanceOf(0.5) ? "quality_issue" : "late_delivery",
      status: drawRefundStatus(initiatedDaysAgo),
      partial: true,
    };
  }
  return null;
}

/**
 * Whether a refund ever actually landed.
 *
 * A quarter of them have not, and that is the point: an SLA watch with two rows
 * on it does not tell an operator whether the queue is under control, and the
 * refunds that go wrong are exactly the ones nobody chased. Older refunds are
 * mostly settled; the ones that are not have been owed for weeks.
 *
 * Bounded at REFUND_BACKLOG_DAYS, because the history runs three months and an
 * unbounded draw put refunds sixty-four days past their promise at the top of
 * the SLA watch. No platform that still had a payments licence would carry that,
 * so a reader who saw it would stop believing the rest of the column. Past the
 * cap the refund is settled — somebody chased it, or the provider auto-reversed.
 */
function drawRefundStatus(initiatedDaysAgo) {
  if (initiatedDaysAgo > REFUND_BACKLOG_DAYS) return "completed";
  if (initiatedDaysAgo > 3) {
    return chanceOf(0.76) ? "completed" : chanceOf(0.45) ? "failed" : "processing";
  }
  if (initiatedDaysAgo > 1) return chanceOf(0.5) ? "completed" : pick(["processing", "failed"]);
  return pick(["initiated", "processing", "completed", "processing"]);
}

function drawPaymentStatus(status, method, refund) {
  if (refund !== null) {
    if (refund.status === "completed") return refund.partial ? "partially_refunded" : "refunded";
    return "captured";
  }
  if (status === "delivered") return "captured";
  if (status === "cancelled") return method === "cod" ? "pending" : "captured";
  if (method === "cod") return "pending";
  return status === "pending" ? "authorized" : "captured";
}

/* ------------------------------------------------------- assemble the deck */

function planOrders() {
  const plans = [];

  // Everything already finished, spread over the history curve.
  const historicCount =
    ORDER_COUNT - LIVE_ORDER_COUNT - STUCK_ORDER_COUNT - RECENT_DELIVERED_COUNT;
  for (let index = 0; index < historicCount; index += 1) {
    const daysAgo = drawDaysAgo();
    const placedMs =
      ANCHOR_MS -
      daysAgo * MS_PER_DAY -
      (new Date(ANCHOR_MS).getUTCHours() - drawHour()) * MS_PER_HOUR -
      between(0, 59) * MS_PER_MINUTE;
    plans.push({
      placedMs: Math.min(placedMs, minutesBeforeAnchor(LIVE_WINDOW_MINUTES + 30)),
      status: chanceOf(0.885) ? "delivered" : "cancelled",
      daysAgo,
    });
  }

  // Tonight's board.
  for (let index = 0; index < LIVE_ORDER_COUNT; index += 1) {
    plans.push({
      placedMs: minutesBeforeAnchor(between(2, LIVE_WINDOW_MINUTES)),
      status: drawLiveStatus(),
      daysAgo: 0,
    });
  }

  // Tonight's finished orders, so "today" is never just the live board.
  for (let index = 0; index < RECENT_DELIVERED_COUNT; index += 1) {
    plans.push({
      placedMs: minutesBeforeAnchor(between(FAST_KITCHEN_MINUTES + 3, 95)),
      status: "delivered",
      daysAgo: 0,
      isFast: true,
    });
  }

  // The ones somebody has to go and find: cooked hours ago, still on the pass.
  for (let index = 0; index < STUCK_ORDER_COUNT; index += 1) {
    plans.push({
      placedMs: minutesBeforeAnchor(between(150, 780)),
      status: index % 2 === 0 ? "ready_for_pickup" : "preparing",
      daysAgo: 0,
      riderWithheld: index % 2 === 0,
    });
  }

  return plans
    .sort((left, right) => left.placedMs - right.placedMs)
    .map((plan, index) => {
      const restaurant = pick(
        plan.isFast === true && FAST_RESTAURANTS.length > 0
          ? FAST_RESTAURANTS
          : restaurants,
      );
      const customer = pick(customers);
      const customerAddresses = addressesByUser.get(customer.id) ?? [];
      const method = pick(PAYMENT_METHODS);
      const initiatedDaysAgo = (ANCHOR_MS - plan.placedMs) / MS_PER_DAY;
      const refund = drawRefund(plan.status, initiatedDaysAgo);
      // Eight orders never got past the payment sheet, which is what the
      // payment failures view is for.
      const paymentStuck = plan.status === "pending" && index % 3 === 0;

      return {
        ...plan,
        orderId: index + 1,
        restaurant,
        customer,
        addressId: customerAddresses[0]?.id ?? 1,
        method,
        failedAttempts: chanceOf(0.06) ? 1 : paymentStuck ? between(1, 2) : 0,
        paymentStuck,
        paymentStatus: drawPaymentStatus(plan.status, method, refund),
        refund: paymentStuck ? null : refund,
        deliveryFailed: plan.status === "cancelled" && chanceOf(0.3),
      };
    });
}

for (const plan of planOrders()) {
  orders.push(buildOrder(plan.orderId, plan));
}

/* --------------------------------------------------------------- settings */

/**
 * What the platform charges, keeps and refuses.
 *
 * Money is a decimal string and every rate is a percent, matching the way the
 * API states both. The two commission overrides exist so the settings screen
 * has to render the case where one kitchen is not on the standard rate — a
 * single global number would have hidden that column entirely.
 */
const settings = {
  delivery: {
    base_fee: "25.00",
    per_km_fee: "5.00",
    free_delivery_above: "599.00",
    surge_multiplier: "1.4",
    surge_after_minutes_late: 20,
    max_distance_km: "14.0",
    packaging_fee: "20.00",
  },
  commission: {
    default_percent: DEFAULT_COMMISSION_PERCENT,
    settlement_days: 7,
    overrides: [
      { restaurant_id: 4, percent: 22, note: "Renegotiated at launch of the biryani tie-up" },
      { restaurant_id: 18, percent: 12, note: "Breakfast-only kitchen, lower basket" },
    ],
  },
  tax: {
    gst_percent: GST_PERCENT,
    is_packaging_taxable: true,
    is_delivery_taxable: false,
    gstin: "29AABCT1332L1ZQ",
  },
  order_rules: {
    min_order_value: "79.00",
    max_items_per_order: 30,
    free_cancellation_minutes: 5,
    late_cancellation_fee_percent: 15,
    refund_sla_hours: 24,
    auto_cancel_unconfirmed_minutes: 12,
    prep_buffer_minutes: 5,
  },
};

/* ------------------------------------------------------------ staff logins */

/**
 * DEVELOPMENT SCAFFOLDING. This is not authentication and never was: the
 * console is UI-only, so "signing in" means matching one of these rows. The
 * passphrase is shared, printed on the sign-in screen, and grants access to
 * nothing but fixture data.
 */
const staff = {
  dev_passphrase: "foodishidev2026",
  accounts: [
    {
      id: 9001,
      name: "Ops Admin",
      email: "ops.admin@foodishi.internal",
      phone: "9000000001",
      city: "Bengaluru",
      platform_role: "admin",
      avatar_url: null,
      created_at: iso(ANCHOR_MS - 400 * MS_PER_DAY),
    },
    {
      id: 9002,
      name: "Meera Iyer",
      email: "meera.iyer@foodishi.internal",
      phone: "9000000002",
      city: "Hyderabad",
      platform_role: "admin",
      avatar_url: `${AVATAR_BASE}/avatar-2.jpg`,
      created_at: iso(ANCHOR_MS - 210 * MS_PER_DAY),
    },
    {
      id: 9003,
      name: "Rohan Shetty",
      email: "rohan.shetty@foodishi.internal",
      phone: "9000000003",
      city: "Pune",
      platform_role: "admin",
      avatar_url: `${AVATAR_BASE}/avatar-5.jpg`,
      created_at: iso(ANCHOR_MS - 96 * MS_PER_DAY),
    },
  ],
};

/* ------------------------------------------------------------------- write */

function write(name, value) {
  const path = join(OUT_DIR, name);
  writeFileSync(path, `${JSON.stringify(value, null, 1)}\n`, "utf8");
  return path;
}

mkdirSync(OUT_DIR, { recursive: true });

const breachedRefunds = refunds.filter(
  (refund) => refund.status !== "completed" && Date.parse(refund.sla_due_at) < ANCHOR_MS,
).length;

const meta = {
  anchor: ANCHOR,
  note:
    "Every timestamp in this directory is anchored on the instant above. The " +
    "fixture layer slides all of them so the anchor reads as 'now', which is " +
    "what keeps the live board live whenever the console is opened. " +
    "Regenerate with `pnpm --filter operator seed`.",
  counts: {
    restaurants: restaurants.length,
    customers: customers.length,
    addresses: addresses.length,
    riders: riders.length,
    orders: orders.length,
    deliveries: deliveries.length,
    payments: payments.length,
    refunds: refunds.length,
    coupons: coupons.length,
    breached_refunds: breachedRefunds,
    live_orders: orders.filter(
      (order) => order.status !== "delivered" && order.status !== "cancelled",
    ).length,
  },
};

write("meta.json", meta);
write("restaurants.json", restaurants);
write("cuisines.json", cuisines);
write("users.json", customers);
write("addresses.json", addresses);
write("delivery-partners.json", riders);
write("orders.json", orders);
write("order-events.json", orderEvents);
write("deliveries.json", deliveries);
write("payments.json", payments);
write("refunds.json", refunds);
write("coupons.json", coupons);
write("settings.json", settings);
write("staff.json", staff);

process.stdout.write(
  `Wrote the operator seed to ${OUT_DIR}\n` +
    Object.entries(meta.counts)
      .map(([name, count]) => `  ${String(count).padStart(5)}  ${name}`)
      .join("\n") +
    "\n",
);
