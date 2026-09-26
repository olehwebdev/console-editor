import { NAME_AFTER, NAME_BEFORE, NOT_NAMES } from '../constants';

/** The name a definition starting at a place of an original's text (1-based line, 0-based column) gives its function, if it says. */
export function nameAt(content: string | null, line: number, column: number): string | null {
  if (content === null) return null;
  let start = 0;
  for (let n = 1; n < line; n++) {
    start = content.indexOf('\n', start) + 1;
    if (start === 0) return null;
  }
  const end = content.indexOf('\n', start);
  const text = content.slice(start, end < 0 ? undefined : end);
  const after = text.slice(column);
  const before = text.slice(0, column);
  const named = (patterns: readonly RegExp[], part: string) =>
    patterns.map((pattern) => pattern.exec(part)?.[1]).find((name): name is string => !!name && !NOT_NAMES.has(name));
  return named(NAME_AFTER, after) ?? named(NAME_BEFORE, before) ?? null;
}
