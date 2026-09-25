import { useMemo } from 'react';
import { frameKey, frameLabel, frameLabels, TOP_FRAME_KEY, useFrameStore } from '@/entities/frame';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import type { ResolveFrame } from './types';

/** A workspace with no frame names yet: one shared object, so selecting it never re-renders. */
const NO_NAMES: Readonly<Record<string, string>> = {};

/**
 * What a row shows of the frame that sent it (named as the console names it), including frames that
 * have gone. The top page's requests show none: most are its, and the rows need the room.
 */
export function useFrameResolver(): ResolveFrame {
  const frames = useFrameStore((s) => s.frames);
  const seen = useFrameStore((s) => s.seen);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  return useMemo(() => {
    const labels = frameLabels(frames, names);
    const live = new Set(frames.map((f) => f.id));
    return (frameId) => {
      const frame = frameId === undefined ? undefined : seen[frameId];
      if (!frame) return null;
      const key = frameKey(frame);
      if (key === TOP_FRAME_KEY) return null;
      return { key, label: labels.get(frame.id) ?? frameLabel(frame, names), url: frame.url, gone: !live.has(frame.id) };
    };
  }, [frames, seen, names]);
}
