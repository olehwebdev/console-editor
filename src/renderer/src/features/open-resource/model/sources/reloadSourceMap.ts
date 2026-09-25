import type { SourceMapKind } from '@common/types';
import { ensureSourceMap } from './ensureSourceMap';
import { toastSourceMapState } from './toastSourceMapState';

/** Looks for a bundle's map again from scratch (a retry, or "Look for a source map"), saying if there's still none. */
export async function reloadSourceMap(bundleUrl: string, kind: SourceMapKind): Promise<void> {
  toastSourceMapState(await ensureSourceMap(bundleUrl, kind, { reload: true }), bundleUrl, kind);
}
