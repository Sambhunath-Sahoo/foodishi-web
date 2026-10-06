"use client";

import * as React from "react";
import { cn } from "@repo/ui";

/**
 * The chips of the Discover toolbar. One build for every chip, so the toggles,
 * the selects and the cuisines share one height, one hairline and one radius.
 *
 * DRAWN 36px, HIT 44px. A 44px bordered pill reads as a heavy button on a
 * desktop and crowds a phone, but a 36px target is too easy to miss with a
 * thumb — and plenty of touch screens report a fine pointer, so `pointer-coarse`
 * alone is not a safe switch. Every chip therefore carries a ::before pad that
 * grows its hit area to 44px tall on every pointer, while drawing at 36px. The
 * rail's 4px of vertical padding is exactly the room that pad needs.
 *
 * "On" is the filled accent, which differs from "off" in lightness as well as
 * hue, and every chip also says it in words to a screen reader (aria-pressed,
 * or the select's chosen value). The toggles add a check mark, since a
 * toggle's label does not change when it flips.
 */
/**
 * The 44px pad, centred on the chip by construction: top 50%, then pulled up
 * by half its own height. It used to be `-inset-y-[5px]`, which only comes out
 * even if you remember that an absolute box is laid out from the PADDING box —
 * inside the 1px border — so 5px out of it is 4px past the drawn edge. The
 * pad was 44px either way, but it was centred by arithmetic nobody could see,
 * and measured from the outside it read as off-centre. Now the height is the
 * 44px it is for, and the centring is stated rather than implied.
 */
const HIT_PAD =
  "before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-['']";

const CHIP_SHAPE = [
  "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-chip border px-3",
  "font-sans text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer",
  HIT_PAD,
];
const CHIP_FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const CHIP_ON = "border-accent bg-accent text-on-accent hover:bg-accent-hover";
const CHIP_OFF =
  "border-line bg-surface text-ink-2 hover:border-line-2 hover:text-ink";

/**
 * A horizontal rail that scrolls inside itself, so the page body never moves
 * sideways (DESIGN.md, rule 4). Full-bleed past the shell's px-4,
 * with matching scroll-padding so the first chip lines up with the column
 * edge.
 * The trailing edge fades rather than hard-clipping a chip mid-word, and the
 * trailing padding is as wide as the fade so the last chip ends clear of it.
 * The mask is alpha only: it hides pixels, it never paints a colour.
 */
export const RAIL =
  "-mx-4 -my-1 flex items-center gap-2 overflow-x-auto scroll-px-4 py-1 pl-4 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]";

/** A hairline between the filter chips and the cuisine chips. */
export function RailDivider(): React.JSX.Element {
  return (
    <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-line-2" />
  );
}

/** A cuisine. Tapping the one you are on clears it. */
export function CuisineChip({
  label,
  selected,
  onSelect,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(CHIP_SHAPE, CHIP_FOCUS, selected ? CHIP_ON : CHIP_OFF)}
    >
      {label}
    </button>
  );
}

/** An on/off filter: a plain label when off, filled accent plus a check when on. */
export function FilterToggle({
  label,
  pressed,
  onToggle,
}: {
  readonly label: string;
  readonly pressed: boolean;
  readonly onToggle: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(CHIP_SHAPE, CHIP_FOCUS, pressed ? CHIP_ON : CHIP_OFF)}
    >
      {pressed ? <CheckIcon /> : null}
      {label}
    </button>
  );
}

/**
 * A native select dressed as a chip. Native on purpose — on a phone the
 * platform picker beats anything we would draw. The visible pill is ours, so
 * it can say "Sort: Top rated" while the options read "Top rated"; the real
 * <select> sits over it, transparent, 44px tall, and is what a pointer, a
 * keyboard and a screen reader all reach.
 *
 * THE CARET IS NOT DECORATION. Without it this is pixel-for-pixel a chip next
 * to two toggle chips, and the only way to find out it opens a menu is to tap.
 */
export function ChipSelect({
  label,
  options,
  value,
  onChange,
  display,
  placeholder,
  isActive = false,
  icon,
}: {
  /** The accessible name of the select. */
  readonly label: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly value: string;
  readonly onChange: (next: string) => void;
  /** What the pill shows, e.g. "Sort: Top rated". */
  readonly display: React.ReactNode;
  readonly placeholder?: string;
  readonly isActive?: boolean;
  readonly icon?: React.ReactNode;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        CHIP_SHAPE,
        "pr-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
        isActive ? CHIP_ON : CHIP_OFF,
      )}
    >
      {icon}
      <span aria-hidden="true">{display}</span>
      <svg
        aria-hidden="true"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={cn("shrink-0", isActive ? "text-on-accent" : "text-ink-3")}
      >
        <path d="m5 9 7 7 7-7" />
      </svg>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="absolute inset-x-0 top-1/2 z-10 h-11 w-full -translate-y-1/2 cursor-pointer appearance-none bg-transparent text-[16px] opacity-0 outline-none"
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="-ml-0.5 shrink-0"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Two bars of unequal length: the conventional "sort" glyph. */
export function SortIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      className="-ml-0.5 shrink-0 text-ink-3"
    >
      <path d="M4 7h16M7 12h10M10 17h4" />
    </svg>
  );
}
