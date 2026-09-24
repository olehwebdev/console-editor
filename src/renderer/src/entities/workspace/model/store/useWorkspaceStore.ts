import { create } from 'zustand';
import type { WorkspaceStore } from './types';

/** The workspaces (mirrors the main process), and which one is shown. */
export const useWorkspaceStore = create<WorkspaceStore>()((set) => ({
  workspaces: [],
  activeId: null,
  favicons: {},
  switchingTo: null,

  setAll: ({ workspaces, activeId }) => set({ workspaces, activeId }),
  patch: (id, patch) => set((s) => ({ workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
  setFavicons: (favicons) => set({ favicons }),
  setFavicon: (id, favicon) =>
    set((s) => {
      if ((s.favicons[id] ?? null) === favicon) return s;
      const { [id]: _old, ...rest } = s.favicons;
      return { favicons: favicon ? { ...rest, [id]: favicon } : rest };
    }),
  setSwitching: (switchingTo) => set({ switchingTo }),
}));
