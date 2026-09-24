const SURROGATE = /[\uD800-\uDFFF]/;

/**
 * Lower-cases without changing the length, so an index into the result is an
 * index into the input. A character whose lower case is longer (`'İ'` → `'i̇'`,
 * `i` + a combining dot) keeps only the base letter, or itself if that isn't a
 * whole character.
 */
export function lowerSameLength(text: string): string {
  let lower = '';
  for (const char of text) {
    const next = char.toLowerCase();
    if (next.length === char.length) lower += next;
    else if (char.length === 1 && !SURROGATE.test(next[0]!)) lower += next[0]!;
    else lower += char;
  }
  return lower;
}
