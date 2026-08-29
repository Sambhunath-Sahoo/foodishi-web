import * as React from "react";
import { cn } from "../lib/cn";
import { TONE_DOT, type Tone } from "../status/tone";

export interface TimelineEntry {
  readonly id: string;
  readonly label: string;
  /** ISO string from the API; rendered in IBM Plex Mono. */
  readonly timestamp?: string;
  readonly detail?: string;
  /** Who moved it: user, restaurant, system or agent. */
  readonly actor?: string;
  readonly tone?: Tone;
}

export interface TimelineProps {
  readonly entries: readonly TimelineEntry[];
  readonly className?: string;
}

/** The order status event trail. Reads top-down, newest last. */
export function Timeline({
  entries,
  className,
}: TimelineProps): React.JSX.Element {
  return (
    <ol className={cn("flex flex-col", className)}>
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;
        return (
          <li key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1.5 size-2.5 shrink-0 rounded-chip",
                  TONE_DOT[entry.tone ?? "mute"],
                )}
              />
              {!isLast ? (
                <span aria-hidden="true" className="w-px flex-1 bg-line-2" />
              ) : null}
            </div>
            <div className={cn("pb-4", isLast && "pb-0")}>
              <p className="font-sans text-[13px] font-medium text-ink">
                {entry.label}
              </p>
              {entry.timestamp !== undefined ? (
                <p className="font-mono text-[11px] tabular-nums text-ink-3">
                  {entry.timestamp}
                  {entry.actor !== undefined ? ` · ${entry.actor}` : ""}
                </p>
              ) : null}
              {entry.detail !== undefined ? (
                <p className="mt-1 text-[13px] text-ink-2">{entry.detail}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
