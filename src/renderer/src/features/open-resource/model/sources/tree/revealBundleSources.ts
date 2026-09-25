import type { SourceMapKind } from '@common/types';
import { bundleNestKey } from '@/entities/source-map';
import { ensureSourceMap } from '../ensureSourceMap';
import { toastSourceMapState } from '../toastSourceMapState';
import { useSourceTree } from './useSourceTree';

/** Opens a bundle's nest of originals and asks the Explorer to scroll to it (from a header or the palette). */
export async function revealBundleSources(bundleUrl: string, kind: SourceMapKind): Promise<void> {
  const key = bundleNestKey(bundleUrl);
  useSourceTree.getState().setOpen(key, true, false);
  useSourceTree.getState().requestScroll(bundleUrl);
  const state = await ensureSourceMap(bundleUrl, kind);
  if (state.status === 'none') {
    useSourceTree.getState().setOpen(key, false, false);
    toastSourceMapState(state, bundleUrl, kind);
  }
}
