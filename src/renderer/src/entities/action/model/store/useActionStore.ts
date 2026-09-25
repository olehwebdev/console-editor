import { create } from 'zustand';
import type { ActionStore } from './types';

/** The active workspace's actions (mirrors the main process's, which announces every change). */
export const useActionStore = create<ActionStore>()((set) => ({
  actions: [],
  setAll: (actions) => set({ actions }),
}));
