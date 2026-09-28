import { create } from 'zustand';
import type { ShotStore } from './types';

/** The active workspace's captures and designs, and the design over the page (mirror the main process's, which announces every change). */
export const useShotStore = create<ShotStore>()((set) => ({
  shots: [],
  overlay: null,
  setAll: (shots) => set({ shots }),
  setOverlay: (overlay) => set({ overlay }),
}));
