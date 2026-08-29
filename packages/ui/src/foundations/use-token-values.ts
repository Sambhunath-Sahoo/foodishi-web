import * as React from "react";

/**
 * Reads the live computed value of a set of CSS custom properties and re-reads
 * them whenever the theme changes, so a swatch prints `#33456b` in light and
 * `#8fa6d4` in dark rather than a hex frozen at build time.
 *
 * `names` must be a stable reference (a module constant) — it is the effect's
 * only dependency.
 */
export function useTokenValues(
  names: readonly string[],
  ref: React.RefObject<HTMLElement | null>,
): Readonly<Record<string, string>> {
  const [values, setValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const element = ref.current;
    if (element === null) return undefined;

    const read = (): void => {
      const computed = window.getComputedStyle(element);
      const next: Record<string, string> = {};
      for (const name of names) {
        next[name] = computed.getPropertyValue(name).trim();
      }
      setValues(next);
    };

    read();

    /* The theme toolbar stamps data-theme on <html>; the OS preference moves
     * without touching the DOM at all. Both have to invalidate the readout. */
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-theme", "class", "style"],
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", read);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", read);
    };
  }, [names, ref]);

  return values;
}
