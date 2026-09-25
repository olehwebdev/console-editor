import type { ConsoleEntry } from '@common/types';

/**
 * For each row after code you ran, by row id: when that code ran. Rows after
 * it show how long after it they came, which tells whether another frame
 * reacted, and how fast. Taken over all rows, so a filter doesn't move it.
 */
export function sinceInput(entries: readonly ConsoleEntry[]): Map<number, number> {
  const since = new Map<number, number>();
  let last: number | null = null;
  for (const entry of entries) {
    if (entry.source === 'input') last = entry.time;
    else if (last !== null) since.set(entry.id, last);
  }
  return since;
}
