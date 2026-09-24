/** Lines in a text; a final newline doesn't start another. */
export function lineCount(text: string): number {
  const lines = text.split('\n').length;
  return text.endsWith('\n') ? lines - 1 : lines;
}
