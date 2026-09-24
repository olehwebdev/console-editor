/** Texts shorter than this never count as minified. */
const MIN_LENGTH = 300;
/** Minified once a line is longer than this, or the lines are longer than this on average. */
const MAX_LINE = 1000;
const MAX_AVERAGE_LINE = 150;

/**
 * Heuristic for "this file is minified": hand-written code has short lines,
 * minified bundles put hundreds or thousands of characters on one line.
 */
export function looksMinified(text: string): boolean {
  if (text.length < MIN_LENGTH) return false;
  let lines = 0;
  let longest = 0;
  let start = 0;
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) {
    if (i > start) lines++;
    longest = Math.max(longest, i - start);
    start = i + 1;
  }
  if (text.length > start) lines++;
  longest = Math.max(longest, text.length - start);
  return longest > MAX_LINE || text.length / Math.max(lines, 1) > MAX_AVERAGE_LINE;
}
