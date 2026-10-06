"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { formatAgo, useSecondsSince } from "../lib/freshness";
import { TONE_SOFT, type Tone } from "../status/tone";

/**
 * Toolbar — filters, not chrome (DENSITY.md §4).
 *
 * One line above a board: the segmented control for the primary axis on the
 * left, dismissible chips for whatever else is narrowing the list, keyboard
 * hints where a shortcut exists, and the live indicator with its interval on
 * the right. No card, no heading, no border box — the toolbar is a row of
 * controls, not a panel.
 */

export interface ToolbarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Names the group for screen readers, e.g. "Live board filters". */
  readonly ariaLabel: string;
  /** The primary axis and any filter chips. */
  readonly children?: React.ReactNode;
  /** Pinned right: keyboard hints, `<LiveDot>`, freshness. */
  readonly right?: React.ReactNode;
}

export function Toolbar({
  ariaLabel,
  children,
  right,
  className,
  ...props
}: ToolbarProps): React.JSX.Element {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex w-full max-w-full flex-wrap items-center gap-x-3 gap-y-2",
        className,
      )}
      {...props}
    >
      {children}
      {right !== undefined ? (
        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
          {right}
        </div>
      ) : null}
    </div>
  );
}

export interface FilterChipProps {
  /** What is being filtered on: "Kitchen", "Status", "Scope". */
  readonly label: string;
  /** The value in force. Omit for a standing statement of fact. */
  readonly value?: string;
  /**
   * Present makes the chip dismissible. A scope the reader cannot change —
   * "Your kitchens only" — leaves this off and stays a quiet statement.
   */
  readonly onDismiss?: () => void;
  readonly tone?: Tone;
  /** Longer explanation, on hover. Never a module name (DENSITY.md §6). */
  readonly title?: string;
  readonly className?: string;
}

export function FilterChip({
  label,
  value,
  onDismiss,
  tone = "mute",
  title,
  className,
}: FilterChipProps): React.JSX.Element {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-chip border py-0.5 pl-2.5",
        "font-sans text-[12px] whitespace-nowrap",
        onDismiss === undefined ? "pr-2.5" : "pr-1",
        TONE_SOFT[tone],
        className,
      )}
    >
      {/* text-ink-2, not the tone at reduced opacity: a faded label measured
          2.7–3.7:1 (SH-2). ink-2 clears 4.5:1 on every tone's soft ground in
          both themes; the value keeps the tone colour and carries the meaning. */}
      <span className="text-ink-2">{label}</span>
      {value !== undefined ? <span className="font-medium">{value}</span> : null}
      {onDismiss !== undefined ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Remove filter: ${label}${value === undefined ? "" : ` ${value}`}`}
          className={cn(
            "-mr-0.5 inline-flex size-4 cursor-pointer items-center justify-center rounded-chip",
            "leading-none opacity-60 hover:bg-surface hover:opacity-100",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
          )}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </span>
  );
}

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  readonly children: React.ReactNode;
}

/** One key cap. `<Kbd>/</Kbd>`, `<Kbd>⌘</Kbd><Kbd>K</Kbd>`. */
export function Kbd({ className, ...props }: KbdProps): React.JSX.Element {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-[18px] items-center justify-center rounded-[4px]",
        "border border-line-2 bg-surface px-1 py-px",
        "font-mono text-[10px] leading-[14px] text-ink-3",
        className,
      )}
      {...props}
    />
  );
}

export interface KbdHintProps {
  /** What the shortcut does, in two or three words. */
  readonly label: string;
  /** The caps, in press order. */
  readonly keys: readonly string[];
  readonly className?: string;
}

/** "Focus search /" — the hint and its keys as one unit. */
export function KbdHint({
  label,
  keys,
  className,
}: KbdHintProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-sans text-[11px] whitespace-nowrap text-ink-3",
        className,
      )}
    >
      {label}
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </span>
  );
}

export interface LiveDotProps {
  /** Seconds between refreshes. Stated, so nobody has to wonder. */
  readonly interval: number;
  /** When the data last came back. Drives the "updated 3s ago" tail. */
  readonly at?: Date | number | null;
  /** Polling stopped — a hidden tab, a failed request, an operator pause. */
  readonly paused?: boolean;
  readonly label?: string;
  readonly className?: string;
}

/**
 * "● Live · every 15s · updated 3s ago". The dot pulses only where motion is
 * welcome; the words carry the state on their own.
 */
export function LiveDot({
  interval,
  at,
  paused = false,
  label = "Live",
  className,
}: LiveDotProps): React.JSX.Element {
  const seconds = useSecondsSince(paused ? null : at);
  const hasAge = !paused && at !== null && at !== undefined;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-sans text-[11px] whitespace-nowrap text-ink-3",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-chip",
          paused ? "bg-mute" : "bg-ok motion-safe:animate-pulse",
        )}
      />
      <span className="font-medium text-ink-2">{paused ? "Paused" : label}</span>
      <span aria-hidden="true" className="text-ink-4">
        ·
      </span>
      <span className="tabular-nums">every {interval}s</span>
      {hasAge ? (
        <>
          <span aria-hidden="true" className="text-ink-4">
            ·
          </span>
          {/* Before mount the age is unknown — "just now" is both true at that
              moment and stable across hydration, which "3s ago" would not be. */}
          <span className="tabular-nums">
            updated {seconds === null ? "just now" : formatAgo(seconds)}
          </span>
        </>
      ) : null}
    </span>
  );
}

export interface FreshnessProps {
  /** When the data last came back. */
  readonly at: Date | number | null | undefined;
  /** Word in front of the age. "updated", "as of", "last checked". */
  readonly prefix?: string;
  readonly className?: string;
}

/**
 * Just the age, for a `<TableFooter updated={…}>` where the live indicator
 * already lives in the toolbar and a second pulsing dot would be noise.
 */
export function Freshness({
  at,
  prefix = "updated",
  className,
}: FreshnessProps): React.JSX.Element | null {
  const seconds = useSecondsSince(at);
  if (at === null || at === undefined) return null;
  return (
    <span className={cn("tabular-nums", className)}>
      {prefix} {seconds === null ? "just now" : formatAgo(seconds)}
    </span>
  );
}
