import { create } from 'zustand';
import { applyResourceOp } from './applyResourceOp';
import { resourceKey } from './resourceKey';
import type { ResourceStore } from './types';

export const useResourceStore = create<ResourceStore>()((set) => ({
  byKey: {},
  reset: () => set({ byKey: {} }),
  add: (entry) => set((s) => ({ byKey: { ...s.byKey, [resourceKey(entry)]: entry } })),
  addMany: (entries) => set((s) => ({ byKey: { ...s.byKey, ...Object.fromEntries(entries.map((e) => [resourceKey(e), e])) } })),
  dropIframe: (iframeId) =>
    set((s) => ({ byKey: Object.fromEntries(Object.entries(s.byKey).filter(([, e]) => e.iframeId !== iframeId)) })),
  apply: (ops) =>
    set((s) => {
      if (!ops.length) return s;
      let byKey = { ...s.byKey };
      for (const op of ops) byKey = applyResourceOp(byKey, op);
      return { byKey };
    }),
}));
