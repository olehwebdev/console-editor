import { GREATEST_LOWER_BOUND, LEAST_UPPER_BOUND, originalPositionFor } from '@jridgewell/trace-mapping';
import type { SourceMapRequestOf, SourceMapWorkerReplies } from '../types';
import { loadedMap } from './loadedMap';
import { mismatchOf } from './mismatchOf';
import { nameAt } from './nameAt';
import type { LoadedMaps } from './types';

/**
 * The original of a place in a bundle as served (where V8 says a function is defined), with the name it
 * gives that function: the map's, else read off the original's text. No tab is involved.
 */
export function toOriginalRaw(maps: LoadedMaps, request: SourceMapRequestOf<'toOriginalRaw'>): SourceMapWorkerReplies['toOriginalRaw'] {
  const entry = loadedMap(maps, request.bundleUrl);
  if (!entry) return { miss: 'unloaded' };
  const needle = { line: request.line + 1, column: request.column };
  let position = originalPositionFor(entry.trace, { ...needle, bias: GREATEST_LOWER_BOUND });
  if (position.source === null) position = originalPositionFor(entry.trace, { ...needle, bias: LEAST_UPPER_BOUND });
  const record = position.source === null ? undefined : entry.records[Number(position.source)];
  if (!record?.url || position.line === null) return { miss: 'unmapped' };
  const lineStart = entry.rawLineStarts?.[request.line];
  return {
    url: record.url,
    line: position.line,
    column: position.column + 1,
    name: position.name ?? nameAt(record.content, position.line, position.column),
    rawOffset: lineStart === undefined ? null : lineStart + request.column,
    mismatch: mismatchOf(entry),
  };
}
