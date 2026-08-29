/**
 * The middle value of a series.
 *
 * Used wherever a caption has to say what a normal one looks like while a
 * single outlier owns the whole axis — one day with 131 orders among thirty
 * days of six, one kitchen forty minutes over while the rest sit on the median.
 */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}
