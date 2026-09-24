import { create } from 'zustand';
import { MAX_CONSOLE_ENTRIES } from '@common/constants';
import type { ConsoleStore } from './types';

/** The console's rows (mirrors the main process's, which sends them in batches). */
export const useConsoleStore = create<ConsoleStore>()((set) => ({
  entries: [],

  append: (entries) =>
    set((s) => {
      if (!entries.length) return s;
      const next = [...s.entries, ...entries];
      return { entries: next.length > MAX_CONSOLE_ENTRIES ? next.slice(-MAX_CONSOLE_ENTRIES) : next };
    }),
  setAll: (entries) => set({ entries: entries.slice(-MAX_CONSOLE_ENTRIES) }),
  clear: () => set((s) => (s.entries.length ? { entries: [] } : s)),
}));
