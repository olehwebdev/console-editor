import { create } from 'zustand';
import type { ActionStore } from './types';

/** The active workspace's actions, and where their panel is (mirrors the main process's, which announces every change). */
export const useActionStore = create<ActionStore>()((set) => ({
  actions: [],
  window: { detached: false, onTop: false },
  setAll: (actions) => set({ actions }),
  setWindow: (window) => set({ window }),
}));
