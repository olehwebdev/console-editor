import { create } from 'zustand';
import type { FrameStore } from './types';

/** Frames remembered after they go away, at most; the oldest are forgotten first. */
const MAX_SEEN_FRAMES = 1000;

/** The page's frames (mirrors the main process's console). */
export const useFrameStore = create<FrameStore>()((set) => ({
  frames: [],
  seen: {},

  setAll: (frames) =>
    set((s) => {
      const seen = { ...s.seen };
      for (const frame of frames) {
        // Re-inserted, so a frame still around counts as the newest.
        delete seen[frame.id];
        seen[frame.id] = frame;
      }
      const ids = Object.keys(seen);
      for (const id of ids.slice(0, Math.max(0, ids.length - MAX_SEEN_FRAMES))) delete seen[id];
      return { frames, seen };
    }),
}));
