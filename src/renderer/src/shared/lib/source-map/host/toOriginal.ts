import { GREATEST_LOWER_BOUND, LEAST_UPPER_BOUND, originalPositionFor } from '@jridgewell/trace-mapping';
import type { SourceMapRequestOf, SourceMapWorkerReplies } from '../types';
import { alignmentFor, lowerBound, viewToRaw } from './align';
import { loadedMap } from './loadedMap';
import { mismatchOf } from './mismatchOf';
import type { LoadedMaps } from './types';

/**
 * The original position of a place in a bundle tab: the mapping at or before it on its line, else
 * the first after it. Edited code has no original.
 */
export function toOriginal(maps: LoadedMaps, request: SourceMapRequestOf<'toOriginal'>): SourceMapWorkerReplies['toOriginal'] {
  const entry = loadedMap(maps, request.bundleUrl);
  if (!entry) return { miss: 'unloaded' };
  const { raw, rawLineStarts } = entry;
  if (raw === null || rawLineStarts === null) return { miss: 'no-bundle' };
  const alignment = alignmentFor(entry, raw, request.view);
  if (!alignment) return { miss: 'need-view' };
  const rawOffset = viewToRaw(entry.rawCode!, alignment, request.offset);
  if (rawOffset === null) return { miss: 'edited' };
  const line = lowerBound(rawLineStarts, rawOffset + 1) - 1;
  const needle = { line: line + 1, column: rawOffset - rawLineStarts[line]! };
  let position = originalPositionFor(entry.trace, { ...needle, bias: GREATEST_LOWER_BOUND });
  if (position.source === null) position = originalPositionFor(entry.trace, { ...needle, bias: LEAST_UPPER_BOUND });
  const url = position.source === null ? null : entry.records[Number(position.source)]?.url;
  if (!url || position.line === null) return { miss: 'unmapped' };
  return { url, line: position.line, column: position.column + 1, mismatch: mismatchOf(entry) };
}
