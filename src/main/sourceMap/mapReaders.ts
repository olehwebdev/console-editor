import type { SourceMapBody, SourceMapFile } from '../../shared/types';
import { fetchSourceMap } from './fetchSourceMap';
import type { ResolvedMapUrl, SourceMapDeps, SourceMapLimits } from './types';

/** What reading a map needs besides where it is. */
export interface MapReadContext {
  bundleUrl: string;
  deps: SourceMapDeps;
  limits: SourceMapLimits;
  /** The answer for a map in hand. */
  found(mapUrl: string | null, map: SourceMapBody): SourceMapFile;
}

/** How each kind of resolved reference is read: a new kind fails typecheck until it has a reader. */
export const MAP_READERS: { [T in ResolvedMapUrl['type']]: (resolved: Extract<ResolvedMapUrl, { type: T }>, context: MapReadContext) => Promise<SourceMapFile> } = {
  failed: async ({ failure, detail }) => ({ status: 'failed', failure, detail, mapUrl: null }),
  inline: async ({ dataUrl }, { found }) => found(null, { type: 'inline', dataUrl }),
  remote: async ({ url }, { bundleUrl, deps, limits, found }) => {
    const fetched = await fetchSourceMap(url, bundleUrl, deps, limits);
    return 'failure' in fetched ? { status: 'failed', failure: fetched.failure, detail: fetched.detail, mapUrl: url } : found(url, { type: 'bytes', bytes: fetched.bytes });
  },
};
