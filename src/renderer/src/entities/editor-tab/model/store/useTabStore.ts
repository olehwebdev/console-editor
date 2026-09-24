import { create } from 'zustand';
import type { TabStore } from './types';

export const useTabStore = create<TabStore>()((set) => ({
  tabs: [],
  pages: [],
  activeId: null,
  diff: 'off',

  add: (tab, activate = true) =>
    set((s) => ({ tabs: [...s.tabs, tab], ...(activate || !s.activeId ? { activeId: tab.id, diff: 'off' as const } : {}) })),
  openPage: (page) =>
    set((s) => ({ pages: s.pages.some((p) => p.id === page.id) ? s.pages : [...s.pages, page], activeId: page.id, diff: 'off' })),
  activate: (id) => set((s) => (s.activeId === id ? s : { activeId: id, diff: 'off' })),
  remove: (id) =>
    set((s) => {
      // The strip shows files, then pages; the neighbour in that order takes over.
      const order = [...s.tabs.map((t) => t.id), ...s.pages.map((p) => p.id)];
      const index = order.indexOf(id);
      if (index === -1) return s;
      const rest = order.filter((other) => other !== id);
      const activeId = s.activeId === id ? (rest[index] ?? rest[index - 1] ?? null) : s.activeId;
      return {
        tabs: s.tabs.filter((t) => t.id !== id),
        pages: s.pages.filter((p) => p.id !== id),
        activeId,
        diff: s.activeId === id ? 'off' : s.diff,
      };
    }),
  patch: (id, patch) => set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  setDiff: (diff) => set({ diff }),
}));
