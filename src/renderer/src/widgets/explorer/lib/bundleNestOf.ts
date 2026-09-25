import type { SourceMapState } from '@/entities/source-map';
import { BUNDLE_NESTS, UNKNOWN_NEST } from './bundleNests';
import type { BundleNest } from './types';

/** What a bundle row shows of its map's state. Generic so each state reaches its own entry without a cast. */
export function bundleNestOf<S extends SourceMapState['status']>(state: Extract<SourceMapState, { status: S }> | undefined, bundleUrl: string): BundleNest | null {
  return state ? BUNDLE_NESTS[state.status](state, bundleUrl) : UNKNOWN_NEST;
}
