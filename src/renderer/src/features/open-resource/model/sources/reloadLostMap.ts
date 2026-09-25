import type { SourceMapKind } from '@common/types';
import type { SourceMapState } from '@/entities/source-map';
import { ensureSourceMap } from './ensureSourceMap';
import { sourceMapLoads } from './sourceMapLoads';

/**
 * Loads a map the worker dropped (idle, or to make room) again: once, however many lookups found it gone at
 * the same time (a batch of renders names hundreds of places in one bundle).
 */
export function reloadLostMap(bundleUrl: string, kind: SourceMapKind): Promise<SourceMapState> {
  const running = sourceMapLoads.reloads.get(bundleUrl);
  if (running) return running;
  const reload = ensureSourceMap(bundleUrl, kind, { reload: true }).finally(() => sourceMapLoads.reloads.delete(bundleUrl));
  sourceMapLoads.reloads.set(bundleUrl, reload);
  return reload;
}
