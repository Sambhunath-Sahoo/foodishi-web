# Foodishi Operator

The internal operations console. Twelve sections behind one sign-in, at
`http://localhost:3000`.

```
pnpm --filter operator dev      # http://localhost:3000
pnpm --filter operator seed     # rewrite lib/services/data/*.json
pnpm --filter operator lint
pnpm --filter operator check-types
```

Sign in with any account printed under the form — `ops.admin@foodishi.internal`
and the passphrase shown beside it.

---

## It is UI-only, and it says so

There is no backend behind this console yet. Every screen reads
`lib/services`, which answers out of the JSON in `lib/services/data`, and the
shell carries a **Sample data** badge on every page so nobody mistakes one of
these figures for tonight's takings.

That is a deliberate stage, not a stub. The data is a coherent platform — 25
kitchens, 90 customers, 420 orders, 31 of them in flight right now, 13 refunds
past their promise — so every board has real work on it, every empty state is
reachable, and every judgement the UI makes (which kitchen is slipping, which
refund is late, which code is about to be refused at checkout) is computed from
the same orders rather than asserted by a fixture.

## The seam

```
app/(console)/*        pages — read hooks, never a service
lib/queries/*          one hook per read and per write, keys in keys.ts
lib/services/index.ts  ← the one line that chooses the source
lib/services/types.ts  what the console needs from a backend, stated once
lib/services/fixtures/ that interface, answered from ./data
lib/services/data/     the seed, written by scripts/generate-seed.mjs
```

`lib/services/types.ts` is the contract. Every shape the FastAPI schema already
defines is imported from `lib/api-types.ts` — `OrderDetail`, `PaymentRead`,
`RefundRead`, `CouponRead` are the generated types, so a fixture that drifted
from a real response is a build error rather than a runtime bug in one screen.
The shapes declared in `types.ts` itself are the ones the API has no name for
yet: platform settings, the commission ledger, the five reports, and the joins a
board needs.

**Putting a backend behind it** is one implementation and one line:

1. Write `lib/services/api/index.ts` exporting an `OperatorServices` whose
   methods call the real endpoints through `@repo/api-client`'s `api` fetcher —
   exactly as `apps/customer/lib/services/api/index.ts` does for the customer
   app.
2. Change the export in `lib/services/index.ts` to that object.

No page, hook or query key moves. There is deliberately no `api/` directory
here today: about half the calls in `types.ts` have an endpoint waiting for them
and the other half do not, so an HTTP client written now would look like a
working integration and be a list of 404s.

## Two things that are not what they look like

**The session is not authentication.** `lib/services/fixtures/session.ts` matches
an email against `data/staff.json` and one shared phrase, then writes the email
to localStorage. It gates nothing an attacker could not read straight out of the
bundle. It exists because the console has to know whose name goes in the header
and because the sign-in screen is a real screen a real deployment needs — built
now, against this seam, rather than bolted on later. When the API arrives,
`RequireAuth` and `SessionProvider` from `@repo/api-client` replace it: a
verified ES256 bearer token and an active row in `platform_staff`.

**Every timestamp slides.** The seed is one coherent evening anchored on
`data/meta.json`'s `anchor`, and `fixtures/clock.ts` shifts everything by
`now - anchor` so that evening always reads as tonight. Written down as fixed
instants it would be over the moment it was committed: open the console a
fortnight later and the live board is empty, every lateness figure is a month,
and the screen the console exists for shows nothing. Relative distances are
preserved exactly, because every row moves by the same amount.

## Writes

The console is not read-only — deactivating a kitchen, correcting its prep time,
switching an account off, creating a coupon, reassigning a rider, retrying a
refund and saving the tax rate are the jobs on the operator's list. Each is a
real method on the service interface. The fixture source satisfies them against
a localStorage overlay (`fixtures/store.ts`): the JSON seed is never mutated,
everything an operator does lands on top of it, and a change survives a reload.

Every rule lives in the service, not in the form. A percentage discount with no
cap, a free-delivery threshold below the delivery fee, a prep time of 900
minutes and a refund promise of zero hours are all refused with the sentence
that says what to change — and the screen shows that sentence rather than
"invalid". Two copies of a rule drift, and the copy in a form is the one that
gets forgotten.

## Sections

| Section | Answers |
|---|---|
| Overview | How is today going |
| Live board | What is in flight, worst first |
| Orders | Find one order — by id, customer or kitchen |
| Deliveries | Who is on the road, and what to do about a stalled ride |
| Restaurants | Who is slipping, and edit or close a kitchen |
| Customers | Who is ordering, and switch an account on or off |
| Offers & coupons | What is being redeemed, and create or edit a code |
| Payments | Transactions, payment failures, and the commission ledger |
| Refund SLAs | Which refunds are late, and move them on |
| Revenue | Where orders end up |
| Reports | Sales, restaurants, orders, customers, commission |
| Settings | Delivery charges, commission, tax, order rules |

Money going back lives on **Refund SLAs** rather than on Payments: it has its own
clock and its own promise, and a second shorter copy of the queue would be one
more place for the two to disagree.

## Design

Every screen obeys `packages/ui/DESIGN.md` (the Neel design system) and
`packages/ui/DENSITY.md` (the Command Deck density standard) — a `StatRail`
rather than a grid of KPI cards, 38px table rows, graded severity on both the
stripe and the text, money right-aligned in tabular figures, and a footer on
every list stating what it is showing and why.

## Regenerating the seed

`pnpm --filter operator seed` rewrites `lib/services/data/*.json` from
`scripts/generate-seed.mjs`. It is deterministic — the same seed produces the
same platform, so a screenshot and a comment about "13 breached refunds" keep
describing the data that is actually there. The 25 kitchens, their menus and
their delivery policies are read from the customer app's fixtures, so the two
apps cannot disagree about what is on the platform.
