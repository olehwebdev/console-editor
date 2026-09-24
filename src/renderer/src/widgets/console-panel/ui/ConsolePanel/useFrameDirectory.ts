import { useMemo } from 'react';
import type { ConsoleFrame } from '@common/types';
import { frameKey, frameLabel, frameLabels, useFrameStore } from '@/entities/frame';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import type { ResolveFrame } from './types';

/** A workspace with no frame names yet: one shared object, so selecting it never re-renders. */
const NO_NAMES: Readonly<Record<string, string>> = {};

/**
 * The page's frames with their labels (the names this workspace gave them
 * first), and what a row shows of its frame, including frames that have gone.
 */
export function useFrameDirectory(): { frames: ConsoleFrame[]; labels: Map<string, string>; names: Readonly<Record<string, string>>; resolve: ResolveFrame } {
  const frames = useFrameStore((s) => s.frames);
  const seen = useFrameStore((s) => s.seen);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  return useMemo(() => {
    const labels = frameLabels(frames, names);
    const live = new Set(frames.map((f) => f.id));
    const resolve: ResolveFrame = (frameId) => {
      const frame = frameId === null ? undefined : seen[frameId];
      if (!frame) return null;
      return { key: frameKey(frame), label: labels.get(frame.id) ?? frameLabel(frame, names), url: frame.url, gone: !live.has(frame.id) };
    };
    return { frames, labels, names, resolve };
  }, [frames, seen, names]);
}
