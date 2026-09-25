import { create } from 'zustand';
import { TOP_FRAME_KEY } from '@/entities/frame';

interface ConsoleTarget {
  /** The frame code runs in, by `frameKey`: it follows the frame across reloads. */
  targetKey: string;
  /** Which frame of that key, while it is on the page (two iframes can share an address). */
  targetId: string | null;
  setTarget(key: string, id: string): void;
}

/** Where the console's prompt runs code (kept while the panel is closed). */
export const useConsoleTarget = create<ConsoleTarget>()((set) => ({
  targetKey: TOP_FRAME_KEY,
  targetId: null,
  setTarget: (targetKey, targetId) => set({ targetKey, targetId }),
}));
