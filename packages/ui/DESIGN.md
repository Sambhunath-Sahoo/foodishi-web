# Neel — Foodishi design system

Approved 2026-08-20. Chosen over two alternatives (Tandoor, a committed-dark
control room; Banana Leaf, a warm consumer-first direction).

## The position

Every food delivery brand reaches for saturated orange or red. We do not — in an
ops console, a screen that is already orange has nothing left to say when an
order runs late.

The accent is **neel**, the indigo of block-printing and dye vats. It carries
structure, links and primary actions. That frees the warm spectrum to mean
something.

| Token | Hex (light) | Means |
|---|---|---|
| `--accent` | `#33456B` | links, primary buttons, focus rings, selected nav |
| `--ok` | `#2F6B4F` | delivered, captured, veg, available |
| `--warn` | `#946200` | preparing, SLA approaching its due time |
| `--crit` | `#9B1C2E` | late, breached, cancelled, failed |
| `--cool` | `#3F6070` | out for delivery |
| `--mute` | `#6B7280` | pending |

## Type

One superfamily, three roles. Plex Sans was drawn for interface text at the
11-13px where most of this product lives, and because Sans and Mono share
skeletons and metrics a money column sits correctly beside its label.

| Face | Token | Utility | Role |
|---|---|---|---|
| IBM Plex Serif | `--font-display` | `font-title` | page titles only — never inside a table |
| IBM Plex Sans | `--font-ui` | `font-sans` | everything else |
| IBM Plex Mono | `--font-code` | `font-mono` | order ids, timestamps, provider refs, money |

Money and any column of digits gets `font-variant-numeric: tabular-nums` and is
right-aligned.

All three are self-hosted by `next/font` in `packages/ui/src/fonts.ts` and
stamped onto `<html>` by each app's root layout. Nothing fetches a typeface
from a third party at runtime. The `latin-ext` subset is not optional: `₹` is
U+20B9, which sits outside `latin`.

The mono token is `--font-code`, not `--font-mono`, because `font-mono` is
Tailwind's own theme key — a token of that name turns the mapping in
`theme.css` into a self-reference, which is how every order id in the product
once ended up in Menlo.

## Non-negotiables

1. **Components read tokens.** No literal colour in a component, ever.
2. **Never define a colour only inside a dark block.** Every token is defined on
   `:root` first, then redefined for dark. A colour that exists only under
   `prefers-color-scheme: dark` renders one theme's text on the other's ground.
3. **Colour never carries meaning alone.** Every status chip has a dot; every
   urgent row has a severity stripe. The board must read without colour vision.
4. **Wide content scrolls inside its own container** (`overflow-x: auto`). The
   page body never scrolls sideways.
5. **The destructive button is outlined, not filled.** A kitchen tablet should
   not have a big red block next to the button tapped forty times an hour.

## Copy rules

- **State the consequence before the tap.** The cancel button reads
  "Cancel — free for 4 more min" or "Cancel — ₹105 fee applies", using the real
  number from the policy frozen onto that order. Never a bare "Cancel" followed
  by a surprise.
- **Surface the server's reason.** The API returns written failures like
  *"Order must be at least 599 to use this coupon"*. Show that, not
  "Invalid coupon".
- **Empty states say what would appear here.** "No breached refunds — every
  refund is inside its SLA" beats a blank panel.

## Density

The tokens do not change between apps. Spacing, type size and touch targets do.

| App | Read at | Density |
|---|---|---|
| operator | arm's length, desktop | dense rows, 13px tables, chip + stripe |
| partner | two feet, tablet, hands busy | one decision per card, 16px+ buttons full width |
| customer | phone, 390px | mobile-first, generous tap targets |
