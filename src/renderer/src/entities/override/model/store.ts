import { create } from 'zustand';
import type { OverrideMeta } from '@common/types';

interface OverrideStore {
  byId: Record<string, OverrideMeta>;
  /** Times each override was served this session. */
  hits: Record<string, number>;
  /** Overrides whose live file changed since they were created. */
  upstreamChanged: Record<string, true>;

  setAll(overrides: OverrideMeta[]): void;
  upsert(override: OverrideMeta): void;
  hit(id: string): void;
  markUpstreamChanged(id: string): void;
}

export const useOverrideStore = create<OverrideStore>()((set) => ({
  byId: {},
  hits: {},
  upstreamChanged: {},

  setAll: (overrides) => set({ byId: Object.fromEntries(overrides.map((o) => [o.id, o])) }),
  upsert: (override) => set((s) => ({ byId: { ...s.byId, [override.id]: override } })),
  hit: (id) => set((s) => ({ hits: { ...s.hits, [id]: (s.hits[id] ?? 0) + 1 } })),
  markUpstreamChanged: (id) => set((s) => (s.upstreamChanged[id] ? s : { upstreamChanged: { ...s.upstreamChanged, [id]: true } })),
}));

export const selectOverrideList = (s: OverrideStore) => Object.values(s.byId);
export const selectEnabledCount = (s: OverrideStore) => Object.values(s.byId).filter((o) => o.enabled).length;
