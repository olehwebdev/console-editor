import { create } from 'zustand';
import type { BrowserStore } from './types';

/** The other browsers (mirrors the main process's list, which announces every change). */
export const useBrowserStore = create<BrowserStore>()((set) => ({
  browsers: [],
  loaded: false,
  driven: [],
  everyday: null,
  downloads: {},
  setAll: (browsers) => set({ browsers, loaded: true }),
  setDriven: (driven) => set({ driven }),
  setEveryday: (everyday) => set({ everyday }),
  setDownload: (id, progress) =>
    set(({ downloads }) => {
      const { [id]: _, ...others } = downloads;
      return { downloads: progress ? { ...others, [id]: progress } : others };
    }),
}));
