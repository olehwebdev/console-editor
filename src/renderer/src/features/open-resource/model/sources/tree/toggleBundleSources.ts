import type { SourceMapKind } from '@common/types';
import { bundleNestKey } from '@/entities/source-map';
import { ensureSourceMap } from '../ensureSourceMap';
import { toastSourceMapState } from '../toastSourceMapState';
import { useSourceTree } from './useSourceTree';

/** Opens or closes a bundle's nest of originals in the Explorer, loading its map when it opens. */
export async function toggleBundleSources(bundleUrl: string, kind: SourceMapKind): Promise<void> {
  const key = bundleNestKey(bundleUrl);
  const opening = !useSourceTree.getState().toggled.has(key);
  useSourceTree.getState().toggle(key);
  if (!opening) return;
  const state = await ensureSourceMap(bundleUrl, kind);
  if (state.status === 'none') {
    useSourceTree.getState().setOpen(key, false, false);
    toastSourceMapState(state, bundleUrl, kind);
  }
}
