import type { SourceMapKind } from '@common/types';
import { useSourceMapStore, type SourceMapState } from '@/entities/source-map';
import { UNCHANGED } from './constants';
import { fetchSourceMapState } from './fetchSourceMapState';
import { sourceMapLoads } from './sourceMapLoads';

/**
 * A bundle's map state, loading it if needed (once, however many ask). A map confirmed since the last
 * page load, or a file known to have none, is answered from the store; a map from before the last page
 * load is checked again (it stays shown meanwhile), and main answers `unchanged` while it still
 * matches. `reload` looks again from scratch.
 */
export function ensureSourceMap(bundleUrl: string, kind: SourceMapKind, { reload = false }: { reload?: boolean } = {}): Promise<SourceMapState> {
  const store = useSourceMapStore.getState();
  const current = store.byBundle[bundleUrl];
  const inFlight = sourceMapLoads.loads.get(bundleUrl);
  if (!reload) {
    if (inFlight) return inFlight;
    if (current?.status === 'none' || (current?.status === 'ready' && current.checked === store.generation)) return Promise.resolve(current);
  }
  const held = !reload && current?.status === 'ready' ? current : undefined;
  if (!held) store.set(bundleUrl, { status: 'loading' });
  const load: Promise<SourceMapState> = fetchSourceMapState(bundleUrl, kind, held && { bundleHash: held.bundleHash, mapUrl: held.mapUrl }).then((result) => {
    const fresh = sourceMapLoads.loads.get(bundleUrl) === load;
    if (fresh) sourceMapLoads.loads.delete(bundleUrl);
    if (result === UNCHANGED) {
      if (fresh) useSourceMapStore.getState().markChecked(bundleUrl);
      return useSourceMapStore.getState().byBundle[bundleUrl] ?? held!;
    }
    if (fresh) useSourceMapStore.getState().set(bundleUrl, result);
    return result;
  });
  sourceMapLoads.loads.set(bundleUrl, load);
  return load;
}
