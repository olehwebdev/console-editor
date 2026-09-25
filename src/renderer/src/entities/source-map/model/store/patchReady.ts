import type { SourceMapState } from './types';

/** The store update applying `patch` to a bundle's state while it is ready; other states stay as they are. */
export function patchReady(byBundle: Record<string, SourceMapState>, bundleUrl: string, patch: { checked?: number; mismatch?: boolean }) {
  const state = byBundle[bundleUrl];
  return state?.status === 'ready' ? { byBundle: { ...byBundle, [bundleUrl]: { ...state, ...patch } } } : {};
}
