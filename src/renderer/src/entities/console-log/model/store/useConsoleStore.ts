import { create } from 'zustand';
import { MAX_CONSOLE_ENTRIES } from '@common/constants';
import type { ConsoleStore } from './types';

/** The console's rows (mirrors the main process's, which sends them in batches). */
export const useConsoleStore = create<ConsoleStore>()((set) => ({
  entries: [],

  append: (entries) =>
    set((s) => {
      // Rows come in id order; ones already here (the startup snapshot overlaps the first batch) are skipped.
      const last = s.entries.at(-1)?.id ?? 0;
      const fresh = entries.filter((e) => e.id > last);
      if (!fresh.length) return s;
      const next = [...s.entries, ...fresh];
      return { entries: next.length > MAX_CONSOLE_ENTRIES ? next.slice(-MAX_CONSOLE_ENTRIES) : next };
    }),
  setAll: (entries) => set({ entries: entries.slice(-MAX_CONSOLE_ENTRIES) }),
  clear: () => set((s) => (s.entries.length ? { entries: [] } : s)),
}));
