import type { SourceMapRequestOf, SourceMapWorkerReplies } from '../types';
import { loadedMap } from './loadedMap';
import type { LoadedMaps } from './types';

/** An original's text, from the first copy the map carries it in. */
export function readSource(maps: LoadedMaps, request: SourceMapRequestOf<'content'>): SourceMapWorkerReplies['content'] {
  const entry = loadedMap(maps, request.bundleUrl);
  if (!entry) return { miss: 'unloaded' };
  const ids = entry.byUrl.get(request.url);
  if (!ids) return { miss: 'unknown-source' };
  const content = ids.map((id) => entry.records[id]!.content).find((text) => text !== null);
  return content === undefined ? { miss: 'no-content' } : { content };
}
