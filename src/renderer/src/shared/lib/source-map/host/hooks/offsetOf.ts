/** The offset of a place in a text: 1-based line, 0-based column; null past its last line. */
export function offsetOf(content: string, line: number, column: number): number | null {
  let start = 0;
  for (let n = 1; n < line; n++) {
    start = content.indexOf('\n', start) + 1;
    if (start === 0) return null;
  }
  return start + column;
}
