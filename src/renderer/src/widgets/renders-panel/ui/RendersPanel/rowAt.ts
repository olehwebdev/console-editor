import type { LogLayout } from './types';

/** Which commit a row of the log is in (its index among the commits shown), and which of that commit's rows it is. */
export function rowAt(layout: LogLayout, row: number): { commit: number; offset: number } {
  let low = 0;
  let high = layout.starts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (layout.starts[middle]! <= row) low = middle;
    else high = middle - 1;
  }
  return { commit: low, offset: row - (layout.starts[low] ?? 0) };
}
