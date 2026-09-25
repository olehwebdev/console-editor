const MARKER = 'sourceMappingURL=';
/** What must come right before the marker: `/*#` or `/*@`, then one space or tab. */
const PREFIX = /\/\*[#@][ \t]$/;
const PREFIX_LENGTH = 4;
const COMMENT_END = '*/';
const LINE_FEED = '\n';
/** Characters a map URL in a stylesheet comment can't hold. */
const FORBIDDEN_VALUE = /["'\s]/;

/**
 * The map a stylesheet names in a `/*# sourceMappingURL=… *\/` comment, as Blink finds it: the last
 * such comment, its value up to the comment's end or the line's, trimmed.
 */
export function findStyleMapComment(text: string): string | null {
  let at = text.lastIndexOf(MARKER);
  while (at !== -1 && !PREFIX.test(text.slice(Math.max(0, at - PREFIX_LENGTH), at))) {
    at = at === 0 ? -1 : text.lastIndexOf(MARKER, at - 1);
  }
  if (at === -1) return null;
  const start = at + MARKER.length;
  const ends = [text.indexOf(COMMENT_END, start), text.indexOf(LINE_FEED, start)].filter((i) => i !== -1);
  const value = text.slice(start, ends.length ? Math.min(...ends) : text.length).trim();
  return value && !FORBIDDEN_VALUE.test(value) ? value : null;
}
