import type { ConsoleEntry, ConsoleLevel } from '@common/types';
import type { ResolveFrame } from './types';

export interface ProblemCount {
  errors: number;
  warnings: number;
}

/** The levels counted, and the count each adds to. */
const COUNTED: Partial<Record<ConsoleLevel, keyof ProblemCount>> = { error: 'errors', warning: 'warnings' };

/** Errors and warnings per frame (by `frameKey`), for the badges on the frame filters. */
export function problemCounts(entries: readonly ConsoleEntry[], resolve: ResolveFrame): Map<string, ProblemCount> {
  const counts = new Map<string, ProblemCount>();
  for (const entry of entries) {
    const field = COUNTED[entry.level];
    const key = field && resolve(entry.frameId)?.key;
    if (!field || key === undefined) continue;
    const count = counts.get(key) ?? { errors: 0, warnings: 0 };
    count[field]++;
    counts.set(key, count);
  }
  return counts;
}
