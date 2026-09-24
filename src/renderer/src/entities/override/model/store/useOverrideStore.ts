import { create } from 'zustand';
import type { OverrideStore } from './types';

export const useOverrideStore = create<OverrideStore>()((set) => ({
  byId: {},
  hits: {},
  upstreamChanged: {},

  setAll: (overrides) => set({ byId: Object.fromEntries(overrides.map((o) => [o.id, o])) }),
  upsert: (override) => set((s) => ({ byId: { ...s.byId, [override.id]: override } })),
  hit: (id) => set((s) => ({ hits: { ...s.hits, [id]: (s.hits[id] ?? 0) + 1 } })),
  markUpstreamChanged: (id) => set((s) => (s.upstreamChanged[id] ? s : { upstreamChanged: { ...s.upstreamChanged, [id]: true } })),
}));
