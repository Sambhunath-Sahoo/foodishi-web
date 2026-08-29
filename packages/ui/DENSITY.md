# Command Deck — the density standard

Approved 2026-08-20, on top of `DESIGN.md`. Tokens are unchanged: Neel indigo
accent, separate semantic hues, IBM Plex Serif titles only, IBM Plex Sans
body, IBM Plex Mono for ids and times. **This document governs density,
hierarchy and copy — not colour.**

It exists because the first build had five problems, all measured on real screens:

1. The live board burned ~450px of dead space on four cards in five columns.
2. Implementation notes (`app/dependencies/scope.py`, `GET /admin/orders?live=true`)
   were printed in the product UI.
3. Five equal-weight 150px KPI cards meant "22 breached SLAs" read no louder
   than "25 restaurants".
4. "671 min late" rendered identically to "3 min late".
5. A chart y-axis ran to 200 while nearly every value was under 10.

---

## 1. StatRail replaces KPI cards

A single horizontal rail, **56–64px tall**, cells divided by 1px borders. Never
a grid of tall cards.

Per cell: a 10px uppercase tracked label, a 20–24px tabular number, and **one
line** of caption. The paragraph that used to live inside a card becomes that
one line or moves to a tooltip.

A cell that needs action takes `--crit-soft` as its background and `--crit` for
its number and label. **At most one or two alarm cells** — if everything is
loud, nothing is.

## 2. Tables over card grids for any list above ~6 items

- Row height **38px**, never taller
- Sticky header, 10px uppercase tracked, `--surface-2` ground
- Ids, timestamps and provider refs in **mono**
- Money **right-aligned** with `tabular-nums`
- Whole-row hover
- Wide tables scroll in their own `overflow-x:auto` container

Cards survive only where one card is one decision — the partner queue.

## 3. Severity is graded, never flat

Three tiers, applied to both the left stripe and the lateness text:

| Tier | When | Token |
|---|---|---|
| 1 | under 1 hour late | `--warn` |
| 2 | 1–6 hours late | `#C2571F` (burnt, between warn and crit) |
| 3 | over 6 hours late | `--crit` |

On time reads `--ok`, in plain weight. Never render a raw minute count above
90 minutes — format as `11h 37m`.

The stripe is a **3px left rule inset 5px vertically**, never a full border and
never a background wash.

## 4. Toolbars carry filters, not chrome

Segmented control for the primary axis, dismissible chips for active filters,
keyboard hints where a shortcut exists, and a live indicator with its interval.
Right-aligned freshness (`updated 3s ago`).

## 5. Footers state the shape of the data

`8 of 125 · sorted by minutes past promised · updated 3s ago`. A list that does
not say what it is showing and why is asking the reader to guess.

## 6. No implementation language in product copy

Never in the UI: file paths, endpoint URLs, module names, HTTP verbs, column
names. A scope limit becomes a quiet chip — "Your kitchens only" — not a
paragraph about `require_staff`.

Server `detail` messages are the exception: they are written for humans and
pass through verbatim.

## 7. Charts scale to their data

Y-axis maximum comes from the series, never a fixed constant. Label the peak.
If the series is mostly zero, say so in a caption rather than drawing a flat
line and hoping.

---

## Density per surface

The tokens do not change between apps. Spacing, type size and touch targets do.

| | operator | partner | customer |
|---|---|---|---|
| Read at | arm's length, desktop | two feet, tablet, hands busy | phone, 390px |
| Row height | 38px | n/a — cards | n/a — cards |
| Body text | 13px | 15px | 15px |
| Primary action | 13px inline | **16px, full width** | 16px, full width |
| Tap target | mouse | **≥44px** | **≥44px** |
| Layout | table | one card = one decision | single column |

Partner and customer keep cards. They inherit the **stripe, the grading, the
mono ids and the tabular money** — the density rules that carry meaning — and
ignore the ones that only suit a mouse.

## The one-line test

Before shipping a screen: *can someone tell what needs doing without scrolling
and without opening anything?* If not, it is not dense enough — or it is loud
in the wrong place.
