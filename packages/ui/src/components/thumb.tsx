"use client";

import * as React from "react";
import { cn } from "../lib/cn";

/**
 * A photo in a fixed box, with a real fallback.
 *
 * Every image surface in the product is optional data: a kitchen that has not
 * uploaded a cover, a dish with an empty gallery, a customer with no avatar.
 * So the fallback is the default state, not an error path — it renders the
 * subject's initials on a token ground rather than a broken-image glyph or a
 * grey rectangle that looks like a loading bug that never resolves.
 *
 * A plain <img>, not next/image: every URL is already a sized Supabase object,
 * and next/image would mean adding sharp plus an images.remotePatterns block to
 * all three apps to re-optimise something that needs no optimising.
 */
export interface ThumbProps {
  /** Absolute URL, or null/undefined when there is no photo. */
  readonly src?: string | null;
  /**
   * What the photo is of. Used for the initials fallback and, for a decorative
   * thumb, nothing else — see `isDecorative`.
   */
  readonly name: string;
  /** Box size in px. Width and height are set on the element to reserve space. */
  readonly size?: number;
  /** `rounded-card` by default; pass "circle" for a person. */
  readonly shape?: "card" | "circle";
  /**
   * True when the adjacent text already names the subject, which is the case on
   * every list row here. An alt that repeats the visible name makes a screen
   * reader say it twice, so the image is marked decorative instead.
   */
  readonly isDecorative?: boolean;
  readonly className?: string;
}

const DEFAULT_SIZE_PX = 56;

/** "Ambur Star Biryani" -> "AS". Two letters is what fits at 40px. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.slice(0, 2).map((word) => word[0] ?? "");
  return letters.join("").toUpperCase();
}

export function Thumb({
  src,
  name,
  size = DEFAULT_SIZE_PX,
  shape = "card",
  isDecorative = true,
  className,
}: ThumbProps): React.JSX.Element {
  // A URL can 404 after the row is rendered (a deleted object, an expired
  // host). Falling back on error means one broken photo never leaves a hole in
  // an otherwise fine list.
  const [hasFailed, setHasFailed] = React.useState(false);
  const showPhoto = typeof src === "string" && src !== "" && !hasFailed;

  // The URL is the identity here: without this, React reuses the element
  // across rows in a virtualised or re-sorted list and a stale error sticks to
  // whatever photo lands next.
  React.useEffect(() => {
    setHasFailed(false);
  }, [src]);

  const box = cn(
    "shrink-0 overflow-hidden bg-surface-2",
    shape === "circle" ? "rounded-chip" : "rounded-card",
    className,
  );
  const dimensions = { width: size, height: size } as const;

  if (!showPhoto) {
    return (
      <span
        aria-hidden={isDecorative ? "true" : undefined}
        role={isDecorative ? undefined : "img"}
        aria-label={isDecorative ? undefined : name}
        className={cn(
          box,
          "flex items-center justify-center border border-line font-semibold text-ink-4 select-none",
        )}
        style={{ ...dimensions, fontSize: Math.max(10, Math.round(size / 3)) }}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    <img
      src={src}
      // Empty alt plus aria-hidden is the correct pairing for a thumbnail whose
      // subject is already named in the row beside it.
      alt={isDecorative ? "" : name}
      aria-hidden={isDecorative ? "true" : undefined}
      {...dimensions}
      loading="lazy"
      decoding="async"
      onError={() => setHasFailed(true)}
      className={cn(box, "object-cover")}
      style={dimensions}
    />
  );
}
