import { create } from 'zustand';
import type { TreeStore } from './types';

/** The Components tree the Inspect view shows (read from the page a level at a time). */
export const useTreeStore = create<TreeStore>()((set) => ({
  frameId: null,
  levels: {},
  expanded: {},
  selected: null,

  setFrame: (frameId) => set({ frameId, levels: {}, expanded: {}, selected: null }),
  setLevel: (key, level) => set((s) => ({ levels: { ...s.levels, [key]: level } })),
  setExpanded: (key, open) => set((s) => ({ expanded: { ...s.expanded, [key]: open } })),
  select: (selected) => set({ selected }),
}));
