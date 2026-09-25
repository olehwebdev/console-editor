/** A trailing `//# sourceMappingURL=…` (or the older `//@`) line. */
const LINE_COMMENT = /^\s*\/\/[#@]\s*sourceMappingURL=(\S*)\s*$/;
/** The same in a one-line block comment. */
const BLOCK_COMMENT = /^\s*\/\*[#@]\s*sourceMappingURL=(\S*?)\s*\*\/\s*$/;
/** Any other whole-line comment (a `//# debugId=…`, a licence line). */
const OTHER_COMMENT = /^\s*(?:\/\/|\/\*.*\*\/\s*$)/;
/** A value that can't be a URL a bundler wrote: the comment is part of something else. */
const FORBIDDEN_VALUE = /["'`]|\*\//;
/** Only this many lines from the end are looked at: map comments are the last thing a bundler writes. */
const MAX_TRAILING_LINES = 64;
const LINE_FEED = '\n';
const CARRIAGE_RETURN = '\r';

/**
 * The map a script names in its trailing comments (ECMA-426's "without parsing" rule): walking back
 * from the end past blank lines and other comments, the last one wins, and any code before it means
 * there is none. A `sourceMappingURL` inside a string or mid-file never counts.
 */
export function findScriptMapComment(text: string): string | null {
  let end = text.length;
  for (let seen = 0; end > 0 && seen < MAX_TRAILING_LINES; seen++) {
    const start = text.lastIndexOf(LINE_FEED, end - 1) + 1;
    let line = text.slice(start, end);
    if (line.endsWith(CARRIAGE_RETURN)) line = line.slice(0, -1);
    end = start - 1;
    if (!line.trim()) continue;
    const value = (LINE_COMMENT.exec(line) ?? BLOCK_COMMENT.exec(line))?.[1];
    if (value !== undefined) return value && !FORBIDDEN_VALUE.test(value) ? value : null;
    if (!OTHER_COMMENT.test(line)) return null;
  }
  return null;
}
