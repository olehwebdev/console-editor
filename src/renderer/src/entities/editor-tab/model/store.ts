import { create } from 'zustand';
import type { ResourceKind } from '@common/types';

export type DiffMode = 'off' | 'base' | 'live';

/** Serializable tab metadata. The Monaco model lives in `models.ts`, keyed by `id`. */
export interface TabMeta {
  id: string;
  url: string;
  kind: ResourceKind;
  /** Set once the tab is saved as an override. */
  overrideId?: string;
  /** Hash of the upstream file this tab was forked from (for new overrides). */
  originalHash: string | null;
  /** Opened in highlight-only mode because the file is huge. */
  lite: boolean;
  dirty: boolean;
  saving: boolean;
}

interface TabStore {
  tabs: TabMeta[];
  activeId: string | null;
  diff: DiffMode;

  add(tab: TabMeta): void;
  activate(id: string): void;
  remove(id: string): void;
  patch(id: string, patch: Partial<TabMeta>): void;
  setDiff(mode: DiffMode): void;
}

export const useTabStore = create<TabStore>()((set) => ({
  tabs: [],
  activeId: null,
  diff: 'off',

  add: (tab) => set((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id, diff: 'off' })),
  activate: (id) => set((s) => (s.activeId === id ? s : { activeId: id, diff: 'off' })),
  remove: (id) =>
    set((s) => {
      const index = s.tabs.findIndex((t) => t.id === id);
      if (index === -1) return s;
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeId = s.activeId === id ? (tabs[index] ?? tabs[index - 1] ?? null)?.id ?? null : s.activeId;
      return { tabs, activeId, diff: s.activeId === id ? 'off' : s.diff };
    }),
  patch: (id, patch) => set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  setDiff: (diff) => set({ diff }),
}));

export const selectActiveTab = (s: TabStore) => s.tabs.find((t) => t.id === s.activeId) ?? null;
export const selectTabById = (id: string) => (s: TabStore) => s.tabs.find((t) => t.id === id);
export const selectHasDirtyTabs = (s: TabStore) => s.tabs.some((t) => t.dirty);
