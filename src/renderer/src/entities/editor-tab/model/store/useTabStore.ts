import { create } from 'zustand';
import type { PageTab, TabStore } from './types';

export const useTabStore = create<TabStore>()((set) => ({
  tabs: [],
  sources: [],
  pages: [],
  activeId: null,
  diff: 'off',

  add: (tab, activate = true) =>
    set((s) => ({ tabs: [...s.tabs, tab], ...(activate || !s.activeId ? { activeId: tab.id, diff: 'off' as const } : {}) })),
  openSource: (tab, activate = true) =>
    set((s) => ({
      sources: s.sources.some((t) => t.id === tab.id) ? s.sources : [...s.sources, tab],
      ...(activate || !s.activeId ? { activeId: tab.id, diff: 'off' as const } : {}),
    })),
  openPage: (page) =>
    set((s) => ({
      // Same id, same kind: the merge keeps the open page's place and what the new one leaves out (a draft).
      pages: s.pages.some((p) => p.id === page.id) ? s.pages.map((p) => (p.id === page.id ? ({ ...p, ...page } as PageTab) : p)) : [...s.pages, page],
      activeId: page.id,
      diff: 'off',
    })),
  retitlePage: (id, title) => set((s) => (s.pages.some((p) => p.id === id && p.title !== title) ? { pages: s.pages.map((p) => (p.id === id ? { ...p, title } : p)) } : s)),
  activate: (id) => set((s) => (s.activeId === id ? s : { activeId: id, diff: 'off' })),
  remove: (id) =>
    set((s) => {
      // The strip shows files, then sources, then pages; the neighbour in that order takes over.
      const order = [...s.tabs.map((t) => t.id), ...s.sources.map((t) => t.id), ...s.pages.map((p) => p.id)];
      const index = order.indexOf(id);
      if (index === -1) return s;
      const rest = order.filter((other) => other !== id);
      const activeId = s.activeId === id ? (rest[index] ?? rest[index - 1] ?? null) : s.activeId;
      return {
        tabs: s.tabs.filter((t) => t.id !== id),
        sources: s.sources.filter((t) => t.id !== id),
        pages: s.pages.filter((p) => p.id !== id),
        activeId,
        diff: s.activeId === id ? 'off' : s.diff,
      };
    }),
  removeTabs: () => set((s) => ({ tabs: [], sources: [], activeId: s.pages.some((p) => p.id === s.activeId) ? s.activeId : null, diff: 'off' })),
  removePages: (ids) =>
    set((s) => {
      const gone = new Set(ids);
      if (!s.pages.some((p) => gone.has(p.id))) return s;
      const pages = s.pages.filter((p) => !gone.has(p.id));
      if (!s.activeId || !gone.has(s.activeId)) return { pages };
      // As `remove` does: the first tab left after the active one in the strip, else the last one before it.
      const order = [...s.tabs.map((t) => t.id), ...s.sources.map((t) => t.id), ...s.pages.map((p) => p.id)];
      const index = order.indexOf(s.activeId);
      const kept = (id: string) => !gone.has(id);
      const activeId = order.slice(index + 1).find(kept) ?? order.slice(0, index).findLast(kept) ?? null;
      return { pages, activeId, diff: 'off' };
    }),
  patch: (id, patch) => set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  setPageDraft: (id, draft) =>
    set((s) => {
      const page = s.pages.find((p) => p.id === id);
      // Only rule pages have drafts; an unchanged draft keeps the store (and its subscribers) still.
      if (!page || (page.page !== 'rule' && page.page !== 'new-rule') || page.draft === draft) return s;
      return { pages: s.pages.map((p) => (p === page ? { ...page, draft } : p)) };
    }),
  setDiff: (diff) => set({ diff }),
}));
