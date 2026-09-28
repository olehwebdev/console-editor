import { create } from 'zustand';
import type { ShotStore } from './types';

/** The active workspace's captures and designs (mirrors the main process's, which announces every change). */
export const useShotStore = create<ShotStore>()((set) => ({
  shots: [],
  setAll: (shots) => set({ shots }),
}));
