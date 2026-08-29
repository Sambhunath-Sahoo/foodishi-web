# foodishi-web

Three Next.js apps on one design system and one API client.

| App | Port | Audience | Sees |
|---|---|---|---|
| `apps/operator` | 3000 | Foodishi ops | everything, all restaurants |
| `apps/partner` | 3001 | restaurant managers and staff | one restaurant — orders, menu, team, offers, reports, money |
| `apps/customer` | 3002 | end customer | their own orders |

| Package | What it is |
|---|---|
| `packages/ui` | the "Neel" design system — tokens, Tailwind preset, components |
| `packages/api-client` | generated OpenAPI types, typed fetch wrapper, TanStack Query provider, dev identity |
| `packages/eslint-config` | shared ESLint config |
| `packages/typescript-config` | shared tsconfigs |

## Running it

The FastAPI service has to be up first:

```bash
cd ../foodishi-api && uv run fastapi dev     # http://localhost:8000
```

Then:

```bash
pnpm install
pnpm dev                                   # all three apps
pnpm --filter operator dev                 # or just one
```

`NEXT_PUBLIC_API_URL` is the only configuration. Copy `.env.example` to
`apps/<app>/.env.local`; there are no secrets in this repo and nothing here is
allowed to hardcode a URL.

## Where the customer app gets its data

`apps/customer` reads everything through one interface, `lib/services/types.ts`,
with two implementations behind it:

| Source | What it is | Needs the API up? |
|---|---|---|
| `fixtures` **(default)** | bundled JSON in `lib/services/fixtures/data/` — 25 kitchens, 333 dishes, 7 orders | no |
| `api` | the FastAPI service over HTTP | yes |

Flip it with one line in `apps/customer/.env.local`:

```bash
NEXT_PUBLIC_DATA_SOURCE=fixtures   # or: api
```

Nothing else changes — no component, hook or query key. `lib/queries/*` depends
on the interface, never on either implementation, so the same screens run
against either source. `lib/services/index.ts` is the whole switch.

The fixture source is not a stub: it filters, sorts and pages like the real
endpoints, prices carts through the same rules as `app/services/pricing.py`,
resolves on a timer so loading states stay honest, and persists what you do
(orders placed, payments, addresses) to localStorage on top of the read-only
JSON seed. Its identity is a stand-in too — `lib/services/fixtures/identity.ts`,
demo password `foodishidev2026` — so every screen is reachable with nothing behind
the app. **That stand-in proves nothing and grants nothing; it only ever runs
when the source is `fixtures`.**

### Not yet behind the interface

Reviews, favourites, support tickets and delivery notes have no endpoints at all
yet, so they live in the browser: `lib/reviews.ts`, `lib/favorites.ts`,
`lib/support.ts`, `lib/delivery-notes.ts` — one hook and one storage key each.
Each is the next thing to move behind `FoodishiServices` once routes exist. The UI
says so on screen rather than implying a server has seen them.

## Where the partner console gets its data

Same shape as the customer app, same switch. `apps/partner` reads everything
through `lib/services/types.ts` — eight services, one interface — with two
implementations behind it:

| Source | What it is | Needs the API up? |
|---|---|---|
| `fixtures` **(default)** | bundled JSON in `lib/services/fixtures/data/` — 2 restaurants, 34 dishes, ~500 orders across 36 days, 6 staff accounts | no |
| `api` | the FastAPI service over HTTP | yes |

```bash
# apps/partner/.env.local
NEXT_PUBLIC_DATA_SOURCE=fixtures   # or: api
```

No component, hook or query key knows which one is running. `lib/queries/*`
depends on the interface; `lib/services/index.ts` is the whole switch.

### What the fixtures do that a stub would not

- **They refuse.** The signed-in person's permissions are checked before any
  write, and a refusal is a real `ApiError` with a status and a sentence — so a
  staff member whose Cancel button was merely *hidden* still cannot cancel, and
  `toUserMessage` prints a fixture 403 and a real one through one path.
- **They enforce the order machine.** Forward one step at a time, never
  backwards, each step needing its own permission. Deleting a dish that has been
  ordered is a 409 that names the alternative, exactly as the API's is.
- **They are internally consistent.** Reports and payouts are *derived* from the
  same orders every other screen shows, so the dashboard, the sales report and
  the settlement cannot disagree. Only settlement *metadata* is seeded; every
  rupee on it is computed.
- **They move with the calendar.** The seed is written against an anchor date and
  shifted forward whole days at load, so today always has a live queue and the
  30 days behind it always have trade. See
  `lib/services/fixtures/data/README.md`.
- **They persist.** Anything you do lands in `localStorage` on top of the
  read-only JSON seed. **Reset** in the header throws it away.

Regenerate the seed with `python3 apps/partner/scripts/seed-fixtures.py
apps/partner/lib/services/fixtures/data` — deterministic, so it is byte-identical
unless the script changed.

### What is fixture-only

`api/unsupported.ts` refuses these by name rather than returning an empty list
that would read as "none" instead of "no such route". Delete each refusal as its
route ships.

| Surface | Missing route |
|---|---|
| Offers and coupons | `/restaurants/{id}/offers`, `/coupons` |
| Reports | `/restaurants/{id}/reports/*` |
| Earnings and settlements | `/restaurants/{id}/earnings`, `/settlements`, `/ledger` |
| Add-ons and variants | `/restaurants/{id}/modifier-groups` |
| Per-person permissions | `PATCH /staff/{id}/permissions` |
| Reset staff access | `POST /staff/{id}/reset-access` |
| Your own profile and password | `PATCH /me`, `POST /me/password` |

### Manager and Staff are two consoles

`lib/permissions.ts` is the model, and it is a permission model rather than a
role check: a role sets a floor, and a manager may grant a staff member exactly
two things on top of it — rejecting an order and cancelling an accepted one.
Everything else is structurally out of a staff member's reach, not merely
unticked. `kitchen.can(permission)` is the only gate any screen asks.

On `NEXT_PUBLIC_DATA_SOURCE=api` the membership row carries a role and no
permissions, so grants come back empty and a staff member there is exactly as
capable as their role — the safe direction for a model the server does not know
about yet.

Sign-in on fixtures is a stand-in, seeded in `data/accounts.json` with a shared
demo password, listed on the sign-in screen off production. **It proves nothing
and grants nothing; it only ever runs when the source is `fixtures`** — and it
exists so the Manager console and the Staff console can be compared without a
backend.

## Regenerating API types

```bash
pnpm --filter @repo/api-client gen
```

Reads the live `/openapi.json`. Run it after any backend change: a changed
response shape then fails the TypeScript build in all three apps rather than
becoming a runtime bug in one.

## The rules

`packages/ui/DESIGN.md` is the contract, not a suggestion. In short: the accent
is indigo and structural; green/amber/red/blue-grey/grey are separate hues that
each mean one thing; Instrument Serif is for page titles only; money is
right-aligned with tabular figures; colour never carries meaning alone; the
destructive button is outlined; wide content scrolls in its own container.
Every component reads a CSS variable — a literal hex in a component is a defect.

`DESIGN.md` and `packages/ui/src/styles/tokens.css` are not to be edited.

## Auth

Real, as of the Supabase change: a signed session plus the `public.users` row
`GET /me` joins to it. All three apps have a sign-in screen, and the API no
longer accepts the old `X-Dev-User-Id` header.

The exception is either app on `NEXT_PUBLIC_DATA_SOURCE=fixtures` — the customer
app and the partner console both have no backend to authenticate against there
and use the stand-ins described above.

## Checks

```bash
pnpm build          # or: npx turbo build
pnpm check-types
pnpm lint
```
