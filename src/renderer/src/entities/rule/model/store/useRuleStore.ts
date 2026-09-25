import { create } from 'zustand';
import { recordHits } from './recordHits';
import type { RuleStore } from './types';

/** The active workspace's rules (mirrors the main process), and what they did this session. */
export const useRuleStore = create<RuleStore>()((set) => ({
  byId: {},
  hits: {},
  recent: {},

  setAll: (rules) => set({ byId: Object.fromEntries(rules.map((r) => [r.id, r])) }),
  upsert: (rule) => set((s) => ({ byId: { ...s.byId, [rule.id]: rule } })),
  recordHits: (batch) => set((s) => (batch.length ? recordHits(s.hits, s.recent, batch, Date.now()) : s)),
}));
