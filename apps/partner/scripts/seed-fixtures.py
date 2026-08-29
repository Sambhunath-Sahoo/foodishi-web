"""
Generates apps/partner/lib/services/fixtures/data/*.json.

Deterministic: one seed, no wall-clock reads. Every timestamp is written
against ANCHOR in IST, and the fixture store shifts whole days from ANCHOR to
the tablet's today at load time, so the dashboard always has a day of trade.

Run: python3 seed.py <out-dir>
"""
import json, random, sys, os
from datetime import date, datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))
ANCHOR = date(2026, 8, 21)          # a Friday
HISTORY_DAYS = 36                   # days of closed trade before today —
                                    # must cover the oldest settlement week
random.seed(20260821)

def iso(dt): return dt.isoformat(timespec="seconds")
def ts(day_offset, hour, minute=0, second=0):
    d = ANCHOR + timedelta(days=day_offset)
    return iso(datetime(d.year, d.month, d.day, hour, minute, second, tzinfo=IST))
def money(v): return f"{round(v, 2):.2f}"

# ── restaurants ────────────────────────────────────────────────────────────
RESTAURANTS = [
    dict(id=1, name="Tandoori Nights", slug="tandoori-nights", city="Hyderabad",
         area="Jubilee Hills", rating="4.4", rating_count=1284, price_for_two="700.00",
         avg_prep_minutes=28, opens_at="11:00:00", closes_at="23:30:00", is_active=True,
         image_url="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=640&q=70",
         description="Charcoal grills, slow-cooked curries and breads out of a clay oven. Family-run since 1998.",
         address_line="Plot 42, Road No. 36, Jubilee Hills", latitude="17.4319", longitude="78.4073",
         phone="+914066778899",
         cuisines=[{"id":1,"name":"North Indian","slug":"north-indian"},{"id":2,"name":"Mughlai","slug":"mughlai"},{"id":3,"name":"Kebabs","slug":"kebabs"}]),
    dict(id=2, name="Paradise Biryani House", slug="paradise-biryani-house", city="Hyderabad",
         area="Secunderabad", rating="4.6", rating_count=3907, price_for_two="600.00",
         avg_prep_minutes=35, opens_at="11:30:00", closes_at="23:00:00", is_active=True,
         image_url="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=640&q=70",
         description="Dum biryani in copper handis, and the salan that belongs with it.",
         address_line="SD Road, Paradise Circle, Secunderabad", latitude="17.4416", longitude="78.4983",
         phone="+914027845612",
         cuisines=[{"id":4,"name":"Hyderabadi","slug":"hyderabadi"},{"id":2,"name":"Mughlai","slug":"mughlai"}]),
]
POLICY = {
    1: dict(restaurant_id=1, cancellation_window_mins=5, cancellation_fee_percent="15.00",
            refund_sla_hours=48, delivery_fee_base="29.00", delivery_fee_per_km="8.00",
            free_delivery_above="499.00", packaging_fee="20.00", min_order_value="149.00",
            max_delivery_distance_km="12.00"),
    2: dict(restaurant_id=2, cancellation_window_mins=3, cancellation_fee_percent="10.00",
            refund_sla_hours=72, delivery_fee_base="35.00", delivery_fee_per_km="9.00",
            free_delivery_above=None, packaging_fee="25.00", min_order_value="199.00",
            max_delivery_distance_km="10.00"),
}
for r in RESTAURANTS:
    r["policy"] = POLICY[r["id"]]

# ── accounts and roster ────────────────────────────────────────────────────
ACCOUNTS = [
    dict(id=101, name="Rohan Pillai", email="rohan@foodishi.example", phone="+919845012301",
         city="Hyderabad", avatar_url=None, password="kitchen123"),
    dict(id=102, name="Meera Joshi", email="meera@foodishi.example", phone="+919845012302",
         city="Hyderabad", avatar_url=None, password="kitchen123"),
    dict(id=103, name="Ishita Iyer", email="ishita@foodishi.example", phone="+919845012303",
         city="Hyderabad", avatar_url=None, password="kitchen123"),
    dict(id=104, name="Arjun Nair", email="arjun@foodishi.example", phone="+919845012304",
         city="Hyderabad", avatar_url=None, password="kitchen123"),
    dict(id=105, name="Kabir Rao", email="kabir@foodishi.example", phone="+919845012305",
         city="Hyderabad", avatar_url=None, password="kitchen123"),
    dict(id=106, name="Fatima Sheikh", email="fatima@foodishi.example", phone="+919845012306",
         city="Hyderabad", avatar_url=None, password="kitchen123"),
]
BY_ID = {a["id"]: a for a in ACCOUNTS}

def person(uid):
    a = BY_ID[uid]
    return dict(id=a["id"], name=a["name"], email=a["email"], phone=a["phone"],
                avatar_url=a["avatar_url"])

def membership(mid, uid, rid, role, active, granted, created_day, updated_day):
    return dict(id=mid, user_id=uid, restaurant_id=rid, role=role, is_active=active,
                created_at=ts(created_day, 9, 30), updated_at=ts(updated_day, 9, 30),
                user=person(uid), granted=granted)

STAFF = {
    1: [
        membership(1, 101, 1, "manager", True, [], -900, -900),
        membership(2, 103, 1, "staff", True, ["orders.reject"], -220, -18),
        membership(3, 104, 1, "staff", True, [], -95, -95),
        membership(4, 106, 1, "staff", False, [], -410, -140),
    ],
    2: [
        membership(5, 102, 2, "manager", True, [], -1500, -1500),
        membership(6, 101, 2, "manager", True, [], -300, -300),
        membership(7, 105, 2, "staff", True, ["orders.reject", "orders.cancel"], -60, -12),
    ],
}

# ── menu ───────────────────────────────────────────────────────────────────
MENU_SEED = {
1: [
 ("Kebabs & Starters", [
  ("Murgh Malai Kebab", 340, False, "mild", 2, 420, "Chicken thigh in cream, cheese and green cardamom, off the skewer.",
   "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=480&q=70"),
  ("Tandoori Chicken (Half)", 320, False, "medium", 2, 510, "Overnight yoghurt marinade, charcoal oven, lemon and onion."),
  ("Paneer Tikka", 290, True, "medium", 2, 380, "Hung-curd marinade, capsicum and onion, cooked hard on the skewer.",
   "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=480&q=70"),
  ("Seekh Kebab", 310, False, "hot", 2, 460, "Minced lamb, green chilli and mint, hand-pressed onto the skewer."),
  ("Hara Bhara Kebab", 240, True, "mild", 2, 300, "Spinach, green peas and paneer, shallow-fried."),
 ]),
 ("Breads", [
  ("Butter Naan", 60, True, "none", 1, 210, "Clay oven, finished with butter."),
  ("Garlic Naan", 75, True, "none", 1, 230, "Garlic and coriander pressed into the dough."),
  ("Laccha Paratha", 70, True, "none", 1, 260, "Layered, flaky, torn rather than cut."),
  ("Tandoori Roti", 40, True, "none", 1, 140, "Wholewheat, no oil."),
 ]),
 ("Curries", [
  ("Butter Chicken", 420, False, "mild", 2, 640, "Tandoor chicken finished in tomato, butter and a little cream.",
   "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=480&q=70"),
  ("Dal Makhani", 300, True, "mild", 2, 480, "Black urad simmered overnight."),
  ("Paneer Butter Masala", 340, True, "mild", 2, 520, "Cashew and tomato gravy, mild by design."),
  ("Rogan Josh", 460, False, "hot", 2, 590, "Lamb on the bone, Kashmiri chilli, fennel."),
  ("Kadai Mushroom", 310, True, "medium", 2, 350, "Button mushroom, peppers, crushed coriander seed."),
 ]),
 ("Rice & Biryani", [
  ("Chicken Dum Biryani", 380, False, "medium", 2, 720, "Sealed handi, long-grain rice, bone-in chicken."),
  ("Veg Dum Biryani", 320, True, "medium", 2, 610, "Same handi, seasonal vegetables and fried onion."),
  ("Jeera Rice", 180, True, "none", 2, 340, "Basmati, cumin, ghee."),
 ]),
 ("Sweets & Drinks", [
  ("Gulab Jamun (2 pc)", 120, True, "none", 1, 320, "Warm, in cardamom syrup."),
  ("Phirni", 140, True, "none", 1, 290, "Ground rice, milk, saffron. Served cold."),
  ("Sweet Lassi", 110, True, "none", 1, 220, "Thick, lightly sweetened, no ice."),
  ("Masala Chai", 60, True, "none", 1, 90, "Boiled with ginger and cardamom."),
 ]),
],
2: [
 ("Biryani", [
  ("Hyderabadi Chicken Biryani", 360, False, "hot", 2, 780, "Kacchi gosht method, sealed and cooked once.",
   "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=480&q=70"),
  ("Mutton Dum Biryani", 480, False, "hot", 2, 860, "Bone-in mutton, aged basmati, two hours on dum."),
  ("Veg Biryani", 300, True, "medium", 2, 640, "Vegetables and paneer, same rice and same handi."),
  ("Egg Biryani", 320, True, "medium", 2, 700, "Two eggs, halved into the rice at the end."),
 ]),
 ("Kebabs", [
  ("Chicken 65", 300, False, "hot", 2, 520, "Curd, chilli and curry leaf, fried hard."),
  ("Apollo Fish", 380, False, "hot", 2, 470, "Boneless basa, Andhra batter, lemon."),
  ("Mutton Seekh", 400, False, "medium", 2, 540, "Minced mutton on the skewer."),
 ]),
 ("Sides", [
  ("Mirchi ka Salan", 120, True, "hot", 2, 210, "Peanut, sesame and long green chilli. The salan the biryani needs."),
  ("Raita", 80, True, "mild", 2, 130, "Onion, tomato, cucumber in set curd."),
  ("Double ka Meetha", 160, True, "none", 1, 420, "Fried bread in saffron milk."),
 ]),
 ("Drinks", [
  ("Irani Chai", 50, True, "none", 1, 110, "Boiled long, strong, with khova."),
  ("Osmania Biscuits (4 pc)", 70, True, "none", 1, 240, "Salt and sugar both. For the chai."),
  ("Salt Lassi", 90, True, "none", 1, 120, "Buttermilk, roasted cumin, curry leaf."),
 ]),
],
}

menu, item_index, cat_id, item_id = {}, {}, 1, 1
for rid, cats in MENU_SEED.items():
    out = []
    for sort_order, (cname, items) in enumerate(cats, start=1):
        rows = []
        for row in items:
            name, price, veg, spice, serves, cals, desc = row[:7]
            img = row[7] if len(row) > 7 else None
            # A couple of dishes start sold out, so the switch has something to say.
            available = not (rid == 1 and name in ("Rogan Josh", "Phirni")) and not (rid == 2 and name == "Apollo Fish")
            rows.append(dict(id=item_id, restaurant_id=rid, category_id=cat_id, name=name,
                             description=desc, price=money(price), is_veg=veg,
                             spice_level=spice, serves=serves, calories=cals,
                             is_available=available, image_url=img))
            item_index[item_id] = dict(id=item_id, rid=rid, name=name, price=price,
                                       category=cname, veg=veg, available=available)
            item_id += 1
        out.append(dict(id=cat_id, restaurant_id=rid, name=cname, sort_order=sort_order, items=rows))
        cat_id += 1
    menu[str(rid)] = out

# ── modifier groups ────────────────────────────────────────────────────────
def ids_named(rid, names):
    return [i["id"] for i in item_index.values() if i["rid"] == rid and i["name"] in names]

def group(gid, rid, name, kind, lo, hi, order, options, items):
    opts = [dict(id=gid * 100 + n, group_id=gid, name=o[0], price_delta=money(o[1]),
                 is_available=o[2] if len(o) > 2 else True, sort_order=n)
            for n, o in enumerate(options, start=1)]
    return dict(id=gid, restaurant_id=rid, name=name, kind=kind, min_select=lo,
                max_select=hi, sort_order=order, options=opts, menu_item_ids=items)

MODIFIERS = [
  group(1, 1, "Portion", "variant", 1, 1, 1,
        [("Half plate", 0), ("Full plate", 160)],
        ids_named(1, {"Chicken Dum Biryani", "Veg Dum Biryani", "Tandoori Chicken (Half)"})),
  group(2, 1, "Heat", "variant", 1, 1, 2,
        [("As the kitchen makes it", 0), ("Less spicy", 0), ("Extra spicy", 0)],
        ids_named(1, {"Rogan Josh", "Seekh Kebab", "Kadai Mushroom", "Chicken Dum Biryani"})),
  group(3, 1, "Add to the curry", "addon", 0, 3, 3,
        [("Extra gravy", 60), ("Butter naan", 60), ("Boiled egg", 30), ("Extra cream", 40, False)],
        ids_named(1, {"Butter Chicken", "Dal Makhani", "Paneer Butter Masala", "Rogan Josh"})),
  group(4, 2, "Portion", "variant", 1, 1, 1,
        [("Single", 0), ("Family pack", 320)],
        ids_named(2, {"Hyderabadi Chicken Biryani", "Mutton Dum Biryani", "Veg Biryani", "Egg Biryani"})),
  group(5, 2, "Goes with the biryani", "addon", 0, 4, 2,
        [("Mirchi ka salan", 60), ("Raita", 40), ("Extra egg", 30), ("Extra gravy", 50)],
        ids_named(2, {"Hyderabadi Chicken Biryani", "Mutton Dum Biryani", "Veg Biryani", "Egg Biryani"})),
]

# ── customers ──────────────────────────────────────────────────────────────
FIRST = ["Aarav","Diya","Kabir","Ananya","Vivaan","Isha","Reyansh","Myra","Aditya","Saanvi",
         "Rudra","Aisha","Neel","Tara","Karan","Nithya","Zoya","Vihaan","Riya","Dhruv"]
LAST = ["Menon","Reddy","Kulkarni","Bose","Chawla","Kapoor","Naidu","Shetty","Bhat","Dutta"]
AREAS = [("Banjara Hills","500034"),("Madhapur","500081"),("Kondapur","500084"),
         ("Begumpet","500016"),("Gachibowli","500032"),("Ameerpet","500038"),
         ("Kukatpally","500072"),("Himayatnagar","500029")]
customers, addresses = [], []
for n in range(40):
    uid = 5001 + n
    name = f"{FIRST[n % len(FIRST)]} {LAST[(n * 3) % len(LAST)]}"
    customers.append(dict(id=uid, name=name, email=f"{name.split()[0].lower()}{n}@example.com",
                          phone=f"+9198{45000000 + n * 137:08d}"[:13], city="Hyderabad",
                          is_active=True, avatar_url=None, created_at=ts(-500 + n, 10)))
    area, pin = AREAS[n % len(AREAS)]
    addresses.append(dict(id=9001 + n, user_id=uid, label="Home" if n % 3 else "Work",
                          line1=f"{101 + n}, {area} Main Road", line2=f"Flat {n % 9 + 1}B" if n % 2 else None,
                          city="Hyderabad", pincode=pin, latitude=money(17.38 + n * 0.004),
                          longitude=money(78.42 + n * 0.005), is_default=True,
                          created_at=ts(-480 + n, 11)))

# ── orders ─────────────────────────────────────────────────────────────────
LIVE_TODAY = {
  1: [("pending", 6), ("pending", 22), ("confirmed", 41), ("preparing", 63),
      ("preparing", 88), ("ready_for_pickup", 112), ("out_for_delivery", 146)],
  2: [("pending", 11), ("confirmed", 34), ("preparing", 71), ("ready_for_pickup", 129)],
}
DAILY = {1: (5, 10), 2: (3, 7)}
# What a customer asks for about the delivery itself, as opposed to a per-item
# note. Mostly absent: most orders have nothing to say, and a board where every
# row carries a highlighted instruction teaches people to stop reading them.
DELIVERY_NOTES = [None] * 6 + [
    "Leave it at the gate, don't ring",
    "Ring the bell twice — baby asleep",
    "Call on arrival, gate code 4417",
    "Second floor, lift is out",
    "Hand it to security if I don't answer",
    "No contact delivery please",
]
CANCEL_REASONS = ["Kitchen is at capacity", "An item is out of stock",
                  "Customer asked us to cancel", "Closing early tonight"]
REJECT_REASONS = ["Kitchen is at capacity", "An item on this order is out of stock",
                  "Cannot make the promised time"]

orders, details, events, oid, item_row_id, event_id = [], {}, {}, 40001, 70001, 90001

def build(rid, day_offset, hour, minute, status, live_now_minutes=None):
    """One order, its lines and its status trail."""
    global oid, item_row_id, event_id
    pol = POLICY[rid]
    pool = [i for i in item_index.values() if i["rid"] == rid]
    lines = random.sample(pool, random.randint(1, 4))
    items, subtotal = [], 0.0
    for line in lines:
        qty = random.choice([1, 1, 1, 2, 2, 3])
        total = line["price"] * qty
        subtotal += total
        note = random.choice([None, None, None, None, "Less oil please", "No onion",
                              "Pack cutlery", "Ring the bell twice"])
        items.append(dict(id=item_row_id, menu_item_id=line["id"], item_name=line["name"],
                          unit_price=money(line["price"]), quantity=qty,
                          line_total=money(total), notes=note))
        item_row_id += 1

    distance = round(random.uniform(1.2, 9.4), 1)
    delivery = 0.0 if (pol["free_delivery_above"] and subtotal >= float(pol["free_delivery_above"])) \
        else float(pol["delivery_fee_base"]) + float(pol["delivery_fee_per_km"]) * distance
    packaging = float(pol["packaging_fee"])
    discount = round(subtotal * random.choice([0, 0, 0, 0.1, 0.15]), 2)
    tax = round((subtotal - discount) * 0.05, 2)
    total = subtotal - discount + tax + packaging + delivery

    cust = random.choice(customers)
    addr = next(a for a in addresses if a["user_id"] == cust["id"])
    placed = datetime.combine(ANCHOR + timedelta(days=day_offset),
                              datetime.min.time(), tzinfo=IST) + timedelta(hours=hour, minutes=minute)
    prep = RESTAURANTS[rid - 1]["avg_prep_minutes"]
    promised = placed + timedelta(minutes=prep + 18 + random.randint(-4, 12))
    cancellable = placed + timedelta(minutes=pol["cancellation_window_mins"])

    delivered_at = cancelled_at = cancel_reason = None
    if status == "delivered":
        # Weighted on-time: a working restaurant keeps roughly four promises in
        # five, and the tail is what the reports screen exists to show.
        delivered_at = promised + timedelta(
            minutes=random.choice(
                [-16, -14, -12, -11, -10, -9, -8, -7, -6, -5, -4, -2, -1, 4, 12, 38]
            )
        )
    elif status == "cancelled":
        cancelled_at = placed + timedelta(minutes=random.randint(2, 26))
        cancel_reason = random.choice(CANCEL_REASONS + REJECT_REASONS)

    row = dict(id=oid, user_id=cust["id"], restaurant_id=rid, address_id=addr["id"],
               coupon_id=random.choice([None, None, None, 1]) if discount else None,
               status=status, subtotal=money(subtotal), packaging_fee=money(packaging),
               delivery_fee=money(delivery), tax_amount=money(tax),
               discount_amount=money(discount), total_amount=money(total),
               distance_km=money(distance), placed_at=iso(placed),
               cancellable_until=iso(cancellable), promised_at=iso(promised),
               cancelled_at=iso(cancelled_at) if cancelled_at else None,
               cancellation_reason=cancel_reason,
               delivery_note=random.choice(DELIVERY_NOTES),
               delivered_at=iso(delivered_at) if delivered_at else None)
    orders.append(row)
    details[str(oid)] = dict(**row, items=items)

    # The trail: every move the order actually made, in order.
    LADDER = ["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "delivered"]
    trail, prev, when = [], None, placed
    reached = LADDER[:LADDER.index(status) + 1] if status in LADDER else ["pending"]
    for step in reached:
        actor = "user" if step == "pending" else ("restaurant" if step in ("confirmed", "preparing", "ready_for_pickup") else "system")
        actor_id = cust["id"] if step == "pending" else (STAFF[rid][0]["user_id"] if actor == "restaurant" else None)
        trail.append(dict(id=event_id, from_status=prev, to_status=step, actor_type=actor,
                          actor_id=actor_id, reason=None, created_at=iso(when)))
        event_id += 1
        prev = step
        when = when + timedelta(minutes=random.randint(2, 12))
    if status == "cancelled":
        refused_before_accept = cancel_reason in REJECT_REASONS
        trail = trail[:1] if refused_before_accept else trail
        trail.append(dict(id=event_id, from_status=trail[-1]["to_status"], to_status="cancelled",
                          actor_type="restaurant", actor_id=STAFF[rid][0]["user_id"],
                          reason=cancel_reason, created_at=iso(cancelled_at)))
        event_id += 1
    events[str(oid)] = trail
    oid += 1

for rid in (1, 2):
    lo, hi = DAILY[rid]
    for day in range(-HISTORY_DAYS, 0):
        for _ in range(random.randint(lo, hi)):
            hour = random.choice([12, 13, 13, 19, 20, 20, 21, 21, 22])
            status = "cancelled" if random.random() < 0.09 else "delivered"
            build(rid, day, hour, random.randint(0, 59), status)
    # Today, closed trade earlier in the day plus the live queue.
    for _ in range(random.randint(5, 9)):
        build(rid, 0, random.choice([12, 12, 13, 13, 14, 18, 19]), random.randint(0, 59),
              "cancelled" if random.random() < 0.12 else "delivered")
    for status, minutes_ago in LIVE_TODAY[rid]:
        # Placed relative to 21:00 so the queue always spans "just in" to "late".
        placed_min = 21 * 60 - minutes_ago
        build(rid, 0, placed_min // 60, placed_min % 60, status)

orders.sort(key=lambda o: o["placed_at"], reverse=True)

# ── offers and coupons ─────────────────────────────────────────────────────
OFFERS = [
 dict(id=1, restaurant_id=1, title="20% off the whole menu", kind="percent", value="20.00",
      description="Weekday lunch push. Caps at ₹120 so a large order does not run away with it.",
      max_discount="120.00", min_order_value="349.00", menu_item_ids=None,
      starts_at=ts(-40, 11), ends_at=ts(20, 23), is_active=True, redemption_count=418),
 dict(id=2, restaurant_id=1, title="₹75 off kebabs", kind="flat", value="75.00",
      description="Moves the skewers on a slow evening.", max_discount=None,
      min_order_value="499.00", menu_item_ids=ids_named(1, {"Murgh Malai Kebab","Paneer Tikka","Seekh Kebab","Hara Bhara Kebab","Tandoori Chicken (Half)"}),
      starts_at=ts(-12, 17), ends_at=ts(4, 23), is_active=True, redemption_count=63),
 dict(id=3, restaurant_id=1, title="Free delivery above ₹599", kind="free_delivery", value="0.00",
      description="Ran over the festival week. Kept for the numbers.", max_discount=None,
      min_order_value="599.00", menu_item_ids=None, starts_at=ts(-95, 0), ends_at=ts(-60, 23),
      is_active=False, redemption_count=1204),
 dict(id=4, restaurant_id=2, title="15% off biryani", kind="percent", value="15.00",
      description="The dish people come for, on the days they do not.", max_discount="150.00",
      min_order_value="299.00", menu_item_ids=ids_named(2, {"Hyderabadi Chicken Biryani","Mutton Dum Biryani","Veg Biryani","Egg Biryani"}),
      starts_at=ts(-25, 11), ends_at=None, is_active=True, redemption_count=902),
 dict(id=5, restaurant_id=2, title="₹50 off the first order", kind="flat", value="50.00",
      description=None, max_discount=None, min_order_value="249.00", menu_item_ids=None,
      starts_at=ts(-200, 0), ends_at=None, is_active=True, redemption_count=3311),
]
COUPONS = [
 dict(id=1, restaurant_id=1, code="TANDOOR20", kind="percent", value="20.00",
      max_discount="150.00", min_order_value="399.00", usage_limit=2000, per_user_limit=2,
      starts_at=ts(-40, 0), ends_at=ts(20, 23), is_active=True, redemption_count=1387),
 dict(id=2, restaurant_id=1, code="LATENIGHT", kind="flat", value="100.00",
      max_discount=None, min_order_value="599.00", usage_limit=500, per_user_limit=1,
      starts_at=ts(-18, 22), ends_at=ts(12, 23), is_active=True, redemption_count=204),
 dict(id=3, restaurant_id=1, code="FREESHIP", kind="free_delivery", value="0.00",
      max_discount=None, min_order_value="299.00", usage_limit=None, per_user_limit=3,
      starts_at=ts(-70, 0), ends_at=ts(-30, 23), is_active=False, redemption_count=845),
 dict(id=4, restaurant_id=2, code="BIRYANI15", kind="percent", value="15.00",
      max_discount="120.00", min_order_value="299.00", usage_limit=5000, per_user_limit=4,
      starts_at=ts(-25, 0), ends_at=None, is_active=True, redemption_count=2960),
 dict(id=5, restaurant_id=2, code="PARADISE50", kind="flat", value="50.00",
      max_discount=None, min_order_value="249.00", usage_limit=1000, per_user_limit=1,
      starts_at=ts(-90, 0), ends_at=ts(-1, 23), is_active=True, redemption_count=1000),
]

# ── settlements ────────────────────────────────────────────────────────────
# Metadata only. Every rupee on these rows is computed from the orders above by
# the fixture service, so the payouts screen can never disagree with the day
# the reports screen is adding up.
SETTLEMENTS = []
sid = 1
for rid in (1, 2):
    last4 = "4471" if rid == 1 else "8802"
    for week, status in enumerate(["paid", "paid", "paid", "processing", "scheduled"]):
        # Oldest first. The newest week ends today and is still scheduled; the
        # one before it is processing. Nothing reaches into the future.
        start = -34 + week * 7
        end = start + 6
        SETTLEMENTS.append(dict(id=sid, restaurant_id=rid,
                                reference=f"TDK-{'TN' if rid == 1 else 'PB'}-{2600 + sid}",
                                period_from_offset=start, period_to_offset=end,
                                status=status,
                                paid_at_offset=end + 2 if status == "paid" else None,
                                account_last4=last4,
                                commission_percent="18.00" if rid == 1 else "20.00"))
        sid += 1

# ── write ──────────────────────────────────────────────────────────────────
out = sys.argv[1]
os.makedirs(out, exist_ok=True)

def dump(name, value, rows_on_one_line=False):
    path = os.path.join(out, name)
    with open(path, "w") as fh:
        if rows_on_one_line and isinstance(value, list):
            fh.write("[\n" + ",\n".join(json.dumps(r, separators=(",", ":")) for r in value) + "\n]\n")
        elif rows_on_one_line and isinstance(value, dict):
            body = ",\n".join(f'{json.dumps(k)}:{json.dumps(v, separators=(",", ":"))}' for k, v in value.items())
            fh.write("{\n" + body + "\n}\n")
        else:
            json.dump(value, fh, indent=2)
            fh.write("\n")
    print(f"{name:24} {os.path.getsize(path)/1024:8.1f} KB")

dump("meta.json", dict(anchor_date=ANCHOR.isoformat(), history_days=HISTORY_DAYS,
                       generated_by="scripts/seed.py", timezone="+05:30"))
dump("restaurants.json", {str(r["id"]): r for r in RESTAURANTS})
dump("accounts.json", ACCOUNTS)
dump("staff.json", STAFF)
dump("menu.json", menu)
dump("modifiers.json", MODIFIERS)
dump("customers.json", dict(users=customers, addresses=addresses))
dump("orders.json", orders, rows_on_one_line=True)
dump("order-details.json", details, rows_on_one_line=True)
dump("order-events.json", events, rows_on_one_line=True)
dump("offers.json", dict(offers=OFFERS, coupons=COUPONS))
dump("settlements.json", SETTLEMENTS)
print(f"\n{len(orders)} orders, {len(item_index)} dishes, {len(customers)} customers")
