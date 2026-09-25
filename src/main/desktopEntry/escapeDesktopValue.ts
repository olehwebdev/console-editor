/** A backslash, which a desktop entry's string values write as two. */
const BACKSLASH = /\\/g;

/**
 * A value as a desktop entry's string type writes it. Its other escapes stand for control characters, which
 * callers keep out of values.
 */
export function escapeDesktopValue(value: string): string {
  return value.replace(BACKSLASH, '\\\\');
}
