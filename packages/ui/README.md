# @repo/ui

The "Neel" design system in code. `DESIGN.md` is the contract; this package is
the implementation. Read `DESIGN.md` first — neither it nor
`src/styles/tokens.css` may be edited.

## Wiring an app

```tsx
// app/layout.tsx — tokens carry a remote @import for the typefaces, which has
// to stay at the top of its own stylesheet, so it is imported here, not
// through the Tailwind pipeline.
import "@repo/ui/styles/tokens.css";
import "./globals.css";
```

```css
/* app/globals.css */
@import "tailwindcss";
@import "@repo/ui/styles/theme.css";
```

`theme.css` is the Tailwind preset. It maps every token to a utility name, so
an app writes `text-crit` and never `text-[#9B1C2E]`. A literal hex in a
component is a defect.

| Utility family | Names |
|---|---|
| ground | `bg`, `surface`, `surface-2`, `line`, `line-2` |
| ink | `ink`, `ink-2`, `ink-3`, `ink-4` |
| accent | `accent`, `accent-hover`, `accent-soft`, `on-accent` |
| semantics | `ok`, `warn`, `crit`, `cool`, `mute` (+ `-soft`) |
| type | `font-title` (IBM Plex Serif, page titles only), `font-sans` (Plex Sans), `font-mono` (Plex Mono) |
| scale | `rounded-card`, `rounded-chip`, `shadow-card` |

## Status colour

`StatusChip` is the only place an order status becomes a colour. It covers the
seven `OrderStatus` values from `app/models/enums.py` plus the derived `late`,
and degrades an unknown status to a muted "Unknown" chip rather than throwing
inside a table row. No app hand-picks a token per status.

## Components

`Badge` · `Button` (primary / ghost / outline / danger, sizes sm / md / lg) ·
`Card` (+ `CardHeader`, `CardTitle`, `CardDescription`, `CardBody`,
`CardFooter`) · `DevIdentityBar` · `DevIdentitySwitcher` · `Dialog` ·
`EmptyState` · `ErrorBanner` · `Field` · `Input` · `PageTitle` · `Pagination` ·
`Select` · `SegmentedControl` · `Skeleton` / `SkeletonRows` · `StatusChip` ·
`Table` (+ `TableScroll`, `TableHead`, `TableBody`, `TableRow`,
`TableHeaderCell`, `TableCell`) · `Timeline` · `UsageBar`

Built into them, from the non-negotiables:

- Chips and banners carry a dot; urgent rows and cards carry a 3px stripe.
- The destructive button is outlined, never filled.
- Every table sits inside `TableScroll`, an `overflow-x: auto` container.
- `TableCell numeric` right-aligns and sets `tabular-nums`; `TableCell mono`
  renders ids, timestamps and provider refs in IBM Plex Mono.
- `EmptyState` takes a `title` that says what would appear there.
- `ErrorBanner` takes the server's own `detail` string.

## Command Deck primitives

`DENSITY.md` is the density standard layered on top of `DESIGN.md`. These five
additions implement it. They are additive: the existing `Table`, `Card` and the
rest are untouched.

### `StatRail` / `Stat` — replaces KPI card grids

```tsx
<StatRail ariaLabel="Platform health">
  <Stat label="Live orders" value={125} caption="38 past their promised time"
        spark={[104, 111, 108, 117, 122, 119, 125]} />
  <Stat label="Breached SLAs" value={22} caption="oldest 11h 37m past due"
        tone="alarm" hint="The paragraph that used to live inside the card." />
</StatRail>
```

One 60px band, cells divided by a 1px rule, scrolls sideways inside its own
border below ~136px per cell. `tone` is `"default" | "ok" | "warn" | "alarm"`;
only `alarm` changes the ground (`--crit-soft` with `--crit` number and label).
**At most one or two alarm cells per rail.**

### `lateTier` / `formatLate` — severity grading

```ts
lateTier(0)   // 0  on time      no stripe,  text-ok
lateTier(43)  // 1  under 1h     --warn
lateTier(91)  // 2  1h to 6h     burnt (warn mixed toward crit)
lateTier(671) // 3  over 6h      --crit

formatLate(43)  // "43m"
formatLate(392) // "6h 32m"
formatLate(697) // "11h 37m"   never a raw minute count above 90
```

Apply with the static maps `SEVERITY_STRIPE`, `SEVERITY_TEXT`, `SEVERITY_SOFT`,
`SEVERITY_TONE`, `SEVERITY_LABEL`. Never build a class name at runtime —
Tailwind scans source text and would emit nothing.

The burnt tier-2 tone is `--color-burnt`, declared in `theme.css` as
`color-mix(in srgb, var(--warn) 55%, var(--crit))`. `tokens.css` has no burnt
token and is not edited; browsers without `color-mix` fall back to `--warn`.

### `DataTable` — the 38px board

```tsx
<DataTableScroll maxHeight={520} footer={
  <TableFooter shown={8} total={125} noun="live orders"
               sortedBy="minutes past promised"
               updated={<Freshness at={fetchedAt} />} />
}>
  <DataTable aria-label="Live orders">
    <DataTableHead>
      <DataTableRow>
        <DataTableHeaderCell>Order</DataTableHeaderCell>
        <DataTableHeaderCell numeric>Total</DataTableHeaderCell>
      </DataTableRow>
    </DataTableHead>
    <DataTableBody>
      <DataTableRow>
        <SeverityCell tier={lateTier(minutes)} mono>{id}</SeverityCell>
        <DataTableCell numeric>{total}</DataTableCell>
      </DataTableRow>
    </DataTableBody>
  </DataTable>
</DataTableScroll>
```

38px rows, sticky 10px uppercase header on `--surface-2`, whole-row hover, and
one `overflow-x` container. `SeverityCell` draws the 3px rule inset 5px on the
leading cell. `maxHeight` is what gives the sticky header something to stick
against.

### `Toolbar` — filters, not chrome

```tsx
<Toolbar ariaLabel="Live board filters"
         right={<><KbdHint label="Focus search" keys={["/"]} />
                  <LiveDot interval={15} at={fetchedAt} /></>}>
  <SegmentedControl … />
  <FilterChip label="Kitchen" value="Tandoori Nights" onDismiss={clear} />
  <FilterChip label="Your kitchens only" tone="accent" />
</Toolbar>
```

A `FilterChip` without `onDismiss` is a standing statement, which is how a
scope limit is expressed — never a paragraph about how scoping is enforced.

### `AutoScaleChart` — the axis comes from the data

```tsx
<AutoScaleChart
  points={[{ label: "6 Aug", value: 1 }, …]}
  ariaLabel="Refunds that breached their SLA, per day"
  tone="crit"
  formatValue={(v) => `₹${Math.round(v / 1000)}k`}
  emptyCaption="No refund breached its SLA in these 14 days."
  caption="Refunds past their promised settlement window, per day." />
```

Y-max is derived from the series on every render, the peak is labelled with its
real value and date, and an all-zero or single-point series renders a sentence
instead of a flat line. Plain SVG; no charting dependency.
