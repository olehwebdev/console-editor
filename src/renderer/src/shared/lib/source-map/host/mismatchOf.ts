import { decodedMappings } from '@jridgewell/trace-mapping';
import { MISMATCH_MIN_SEGMENTS, MISMATCH_RATIO } from '../constants';
import type { LoadedMap } from './types';

/**
 * Whether many of the map's positions fall outside its bundle's lines (a map of another build, or not
 * this file's). Worked out once, on the first jump: a few stray segments are tolerated.
 */
export function mismatchOf(entry: LoadedMap): boolean {
  if (entry.mismatch !== undefined) return entry.mismatch;
  const { raw, rawLineStarts } = entry;
  if (raw === null || rawLineStarts === null) return (entry.mismatch = false);
  let total = 0;
  let outside = 0;
  decodedMappings(entry.trace).forEach((segments, line) => {
    const start = rawLineStarts[line];
    const end = line + 1 < rawLineStarts.length ? rawLineStarts[line + 1]! - 1 : raw.length;
    const length = start === undefined ? -1 : end - start;
    for (const segment of segments) {
      total++;
      if (segment[0] > length) outside++;
    }
  });
  return (entry.mismatch = outside > Math.max(MISMATCH_MIN_SEGMENTS, total * MISMATCH_RATIO));
}
