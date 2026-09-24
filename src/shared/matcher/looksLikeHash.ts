/** An all-hex segment needs at least this many characters to count as a hash. */
const MIN_HEX_HASH_LENGTH = 8;
/** A segment that isn't all hex needs at least this many characters to count as a hash. */
const MIN_MIXED_HASH_LENGTH = 6;
const HEX_HASH = new RegExp(`^[0-9a-f]{${MIN_HEX_HASH_LENGTH},}$`);

export function looksLikeHash(segment: string): boolean {
  if (HEX_HASH.test(segment)) return true;
  return segment.length >= MIN_MIXED_HASH_LENGTH && /^[0-9A-Za-z_-]+$/.test(segment) && /\d/.test(segment) && /[A-Za-z]/.test(segment);
}
