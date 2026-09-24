import type { FrameStore } from './types';

/** The top page's frame id, or null before there is one. */
export const selectTopFrameId = (s: FrameStore) => s.frames.find((f) => !f.parentId)?.id ?? null;
