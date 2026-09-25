import type { ConsoleEntry } from '@common/types';

/** A row's values as one line of text, as the text filter and Copy see it. */
export function entryText(entry: ConsoleEntry): string {
  return entry.values.map((v) => v.text).join(' ');
}
