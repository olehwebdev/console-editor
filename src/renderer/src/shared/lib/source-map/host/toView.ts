import type { SourceMapRequestOf, SourceMapWorkerReplies } from '../types';
import { alignmentFor, rawToView } from './align';
import { loadedMap } from './loadedMap';
import type { LoadedMaps } from './types';

/** Where a raw bundle offset (from `toBundle`) is in a bundle tab's text. */
export function toView(maps: LoadedMaps, request: SourceMapRequestOf<'toView'>): SourceMapWorkerReplies['toView'] {
  const entry = loadedMap(maps, request.bundleUrl);
  if (!entry) return { miss: 'unloaded' };
  const { raw } = entry;
  if (raw === null) return { miss: 'no-bundle' };
  const alignment = alignmentFor(entry, raw, request.view);
  if (!alignment) return { miss: 'need-view' };
  return rawToView(entry.rawCode!, alignment, request.rawOffset);
}
