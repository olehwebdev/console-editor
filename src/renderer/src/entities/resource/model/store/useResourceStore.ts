import { create } from 'zustand';
import { applyResourceOp } from './applyResourceOp';
import { resourceKey } from './resourceKey';
import type { ResourceStore } from './types';

export const useResourceStore = create<ResourceStore>()((set, get) => ({
  byKey: {},
  // Through `apply`, so each op's rule lives in one place (its applier).
  reset: () => get().apply([{ type: 'reset' }]),
  add: (entry) => set((s) => ({ byKey: { ...s.byKey, [resourceKey(entry)]: entry } })),
  addMany: (entries) => set((s) => ({ byKey: { ...s.byKey, ...Object.fromEntries(entries.map((e) => [resourceKey(e), e])) } })),
  dropIframe: (iframeId) => get().apply([{ type: 'drop-iframe', iframeId }]),
  dropWorker: (workerId) => get().apply([{ type: 'drop-worker', workerId }]),
  apply: (ops) =>
    set((s) => {
      if (!ops.length) return s;
      let byKey = { ...s.byKey };
      for (const op of ops) byKey = applyResourceOp(byKey, op);
      return { byKey };
    }),
}));
