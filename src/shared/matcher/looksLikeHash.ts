/** A segment that isn't all hex needs at least this many characters to count as a hash. */
const MIN_MIXED_HASH_LENGTH = 6;

export function looksLikeHash(segment: string): boolean {
  if (/^[0-9a-f]{8,}$/.test(segment)) return true;
  return segment.length >= MIN_MIXED_HASH_LENGTH && /^[0-9A-Za-z_-]+$/.test(segment) && /\d/.test(segment) && /[A-Za-z]/.test(segment);
}
