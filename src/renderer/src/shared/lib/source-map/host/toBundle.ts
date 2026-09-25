import { generatedPositionFor, LEAST_UPPER_BOUND } from '@jridgewell/trace-mapping';
import { MAX_LINE_PROBE } from '../constants';
import type { SourceMapRequestOf, SourceMapWorkerReplies } from '../types';
import { loadedMap } from './loadedMap';
import { mismatchOf } from './mismatchOf';
import type { LoadedMaps } from './types';

/**
 * Where an original line's code starts in the raw bundle: its first mapping (a lookup at column 0
 * finds the first segment on the line, wherever it starts). A line without code (types, comments,
 * code the build dropped) gives way to the nearest one below it, then above.
 */
export function toBundle(maps: LoadedMaps, request: SourceMapRequestOf<'toBundle'>): SourceMapWorkerReplies['toBundle'] {
  const entry = loadedMap(maps, request.bundleUrl);
  if (!entry) return { miss: 'unloaded' };
  const ids = entry.byUrl.get(request.url);
  if (!ids) return { miss: 'unknown-source' };
  const { raw, rawLineStarts } = entry;
  if (raw === null || rawLineStarts === null) return { miss: 'no-bundle' };
  const below = Array.from({ length: MAX_LINE_PROBE }, (_, i) => request.line + 1 + i);
  const above = Array.from({ length: MAX_LINE_PROBE }, (_, i) => request.line - 1 - i).filter((line) => line >= 1);
  for (const line of [request.line, ...below, ...above]) {
    let best: { line: number; column: number } | null = null;
    // A file the map lists twice may have code under either copy: the earliest wins.
    for (const id of ids) {
      const found = generatedPositionFor(entry.trace, { source: String(id), line, column: 0, bias: LEAST_UPPER_BOUND });
      if (found.line !== null && (!best || found.line < best.line || (found.line === best.line && found.column < best.column))) best = found;
    }
    if (!best) continue;
    const start = rawLineStarts[best.line - 1];
    const end = best.line < rawLineStarts.length ? rawLineStarts[best.line]! - 1 : raw.length;
    if (start === undefined || start + best.column > end) return { miss: 'outside-bundle' };
    return { rawOffset: start + best.column, line, mismatch: mismatchOf(entry) };
  }
  return { miss: 'no-code-near' };
}
