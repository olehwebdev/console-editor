import { create } from 'zustand';
import type { Workspace, WorkspacePatch, WorkspacesState } from '@common/types';

interface WorkspaceStore {
  workspaces: Workspace[];
  /** The workspace shown; null until loaded. */
  activeId: string | null;
  /** Site icons (data URLs) by workspace id. */
  favicons: Record<string, string>;
  /** The workspace being switched to, while the switch runs. */
  switchingTo: string | null;

  setAll(state: WorkspacesState): void;
  patch(id: string, patch: WorkspacePatch): void;
  setFavicons(favicons: Record<string, string>): void;
  setFavicon(id: string, favicon: string | null): void;
  setSwitching(id: string | null): void;
}

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

export const selectActiveWorkspace = (s: WorkspaceStore) => s.workspaces.find((w) => w.id === s.activeId) ?? null;
export const selectWorkspaceById = (id: string) => (s: WorkspaceStore) => s.workspaces.find((w) => w.id === id);
