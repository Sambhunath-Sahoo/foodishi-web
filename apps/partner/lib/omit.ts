/**
 * A copy of an object without one key.
 *
 * Written out rather than destructured because `const { items: _items, ...row }`
 * leaves an unused binding behind, and this repository's lint treats an unused
 * binding as an error whatever it is named. It copies — nothing here mutates
 * the object it was handed.
 */
export function omit<TValue extends object, TKey extends keyof TValue>(
  value: TValue,
  key: TKey,
): Omit<TValue, TKey> {
  const copy = { ...value } as Record<string, unknown>;
  delete copy[key as string];
  return copy as Omit<TValue, TKey>;
}
