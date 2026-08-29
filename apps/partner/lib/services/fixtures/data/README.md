# Fixture seed

Bundled JSON the partner console reads when `NEXT_PUBLIC_DATA_SOURCE` is
`fixtures` (the default). **The seed is read-only.** Nothing at runtime writes
back to these files — every change a manager or a staff member makes lands in
the overlay in `../store.ts` and is kept in `localStorage`, on top of what is
here. `resetFixtures()` wipes the overlay and leaves the seed untouched.

Regenerate with:

```sh
python3 scripts/seed-fixtures.py lib/services/fixtures/data
```

The generator is deterministic — one seed, no wall-clock reads — so a
regeneration produces byte-identical files unless the script itself changed.

## Why the timestamps are in the past

Every instant is written against the **anchor date** in `meta.json`, in IST
(`+05:30`). `store.ts` shifts the whole seed forward by whole days from the
anchor to the tablet's today, so:

- today always has a live queue and a day of closed trade,
- the 30 days behind it always have something for the reports screen,
- and the wall-clock time of every order stays exactly where it was written —
  a 21:04 ticket is a 21:04 ticket whatever day it is read on.

Shifting by whole days rather than by an arbitrary offset is what keeps
"orders per day" honest: a day in the seed is still a day on screen.

## Files

| File | What it holds |
| --- | --- |
| `meta.json` | The anchor date, and how many days of history follow it. |
| `accounts.json` | Sign-ins. `password` is here because there is no auth server; see `../identity.ts`. |
| `restaurants.json` | Restaurant id → the full profile, cuisines and policy. |
| `staff.json` | Restaurant id → its roster, each row with a role and granted permissions. |
| `menu.json` | Restaurant id → categories, each with its dishes. |
| `modifiers.json` | Add-on and variant groups, with their options and the dishes they are attached to. |
| `customers.json` | The people behind the orders, and their delivery addresses. |
| `orders.json` | Every order, list-row shape, newest first. One per line. |
| `order-details.json` | Order id → the same row plus its lines. |
| `order-events.json` | Order id → its status trail. |
| `offers.json` | Offers and coupons. |
| `settlements.json` | Payout **metadata** only — reference, period, status, account. Every rupee on a settlement is computed from `orders.json`, so the payouts screen cannot disagree with the reports screen. |
