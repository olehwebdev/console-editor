import { create } from 'zustand';
import type { BrowserStore } from './types';

/** The other browsers (mirrors the main process's list, which announces every change). */
export const useBrowserStore = create<BrowserStore>()((set) => ({
  browsers: [],
  loaded: false,
  driven: [],
  setAll: (browsers) => set({ browsers, loaded: true }),
  setDriven: (driven) => set({ driven }),
}));
