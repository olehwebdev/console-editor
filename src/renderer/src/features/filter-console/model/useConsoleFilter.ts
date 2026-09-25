import { create } from 'zustand';
import { DEFAULT_LEVELS } from './constants';
import type { ConsoleFilter } from './types';

/** What the console shows (the rows themselves are all kept). */
export const useConsoleFilter = create<ConsoleFilter>()((set) => ({
  frameKeys: [],
  levels: DEFAULT_LEVELS,
  text: '',
  preserveLog: false,

  toggleFrame: (key) =>
    set((s) => ({ frameKeys: s.frameKeys.includes(key) ? s.frameKeys.filter((k) => k !== key) : [...s.frameKeys, key] })),
  showAllFrames: () => set((s) => (s.frameKeys.length ? { frameKeys: [] } : s)),
  toggleLevel: (level) => set((s) => ({ levels: { ...s.levels, [level]: !s.levels[level] } })),
  setText: (text) => set({ text }),
  togglePreserveLog: () => set((s) => ({ preserveLog: !s.preserveLog })),
}));
