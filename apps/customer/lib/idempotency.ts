/**
 * One key per checkout attempt. POST /orders stores it with the order, so a
 * double-tap on a slow phone returns the original order instead of creating a
 * second one and charging twice (API_PLAN §0.3).
 *
 * The key is generated when the attempt starts and reused for every retry of
 * that same attempt. A new attempt — the customer changed something and tapped
 * again — gets a new key, because it really is a different order.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Older WebViews have crypto.getRandomValues but not randomUUID.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
