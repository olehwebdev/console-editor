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

/** A tab showing an app page rather than a file (like VS Code's release notes). Not kept between runs. */
export interface PageTab {
  id: string;
  page: 'whats-new';
  title: string;
}

interface TabStore {
  /** File tabs. Pages are kept apart, so everything that works on files ignores them. */
  tabs: TabMeta[];
  pages: PageTab[];
  /** The active file tab or page. */
  activeId: string | null;
  diff: DiffMode;

  /** Adds a tab, and makes it the active one unless `activate` is false. */
  add(tab: TabMeta, activate?: boolean): void;
  /** Shows a page, opening its tab (after the file tabs) if it isn't open yet. */
  openPage(page: PageTab): void;
  activate(id: string): void;
  /** Closes a file tab or a page. */
  remove(id: string): void;
  patch(id: string, patch: Partial<TabMeta>): void;
  setDiff(mode: DiffMode): void;
}

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

export const selectActiveTab = (s: TabStore) => s.tabs.find((t) => t.id === s.activeId) ?? null;
export const selectActivePage = (s: TabStore) => s.pages.find((p) => p.id === s.activeId) ?? null;
export const selectTabById = (id: string) => (s: TabStore) => s.tabs.find((t) => t.id === id);
export const selectHasDirtyTabs = (s: TabStore) => s.tabs.some((t) => t.dirty);
