import { create } from 'zustand';
import { MAX_KNOWN_BUNDLES } from './constants';
import { patchReady } from './patchReady';
import type { SourceMapState, SourceMapStore } from './types';

export const useSourceMapStore = create<SourceMapStore>()((set) => ({
  byBundle: {},
  generation: 0,

  set: (bundleUrl, state) =>
    set((s) => {
      const kept: [string, SourceMapState][] = [];
      let excess = Object.keys(s.byBundle).length - (bundleUrl in s.byBundle ? 1 : 0) + 1 - MAX_KNOWN_BUNDLES;
      for (const entry of Object.entries(s.byBundle)) {
        if (entry[0] === bundleUrl) continue;
        // Oldest first; a load in flight still owes its answer, so it stays.
        if (excess > 0 && entry[1].status !== 'loading') excess--;
        else kept.push(entry);
      }
      return { byBundle: Object.fromEntries([...kept, [bundleUrl, state]]) };
    }),
  markChecked: (bundleUrl) => set((s) => patchReady(s.byBundle, bundleUrl, { checked: s.generation })),
  markMismatch: (bundleUrl) => set((s) => patchReady(s.byBundle, bundleUrl, { mismatch: true })),
  nextGeneration: () => set((s) => ({ generation: s.generation + 1 })),
  clear: () => set({ byBundle: {} }),
}));
