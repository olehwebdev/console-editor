import { create } from 'zustand';
import { profileCommits } from '../../lib/profile';
import { MAX_COMMITS } from './constants';
import type { RenderLogStore } from './types';

/** The Renders log: whether commits are recorded, and those recorded (while it records or until cleared). */
export const useRenderLog = create<RenderLogStore>()((set) => ({
  recording: false,
  commits: [],
  profiles: new Map(),

  setRecording: (recording) => set({ recording }),
  add: (commits) =>
    set((s) => {
      const all = [...s.commits, ...commits];
      const dropped = all.slice(0, Math.max(0, all.length - MAX_COMMITS));
      return { commits: all.slice(dropped.length), profiles: profileCommits(s.profiles, commits, dropped) };
    }),
  clear: () => set({ commits: [], profiles: new Map() }),
}));
