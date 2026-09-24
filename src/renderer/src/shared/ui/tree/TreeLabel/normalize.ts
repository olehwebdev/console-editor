import type { TextRange } from './types';

export function normalize(ranges: readonly TextRange[], length: number): TextRange[] {
  const sorted = ranges
    .map(([s, e]) => [Math.max(0, Math.min(s, length)), Math.max(0, Math.min(e, length))] as const)
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of sorted) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  return merged;
}
