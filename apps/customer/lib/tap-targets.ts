/**
 * Customer is read one-handed on a phone (DESIGN.md, density table), so every
 * control is at least 44px tall. Shared @repo/ui components are sized for the
 * desktop apps too and are not changed for this one; these are the local
 * className additions that bring them up to a thumb.
 */

/** Raises every tab inside a SegmentedControl, whose buttons take no className. */
export const SEGMENTED_TAP_TARGET = "[&>button]:min-h-11";

/** Raises an Input or Select from its 40px default. Wins over h-10 via cn(). */
export const FIELD_TAP_TARGET = "h-11";
