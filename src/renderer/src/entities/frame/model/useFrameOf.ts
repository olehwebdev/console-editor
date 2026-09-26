import { useMemo } from 'react';
import { frameLabels } from '../lib';
import { useFrameStore } from './store';
import type { FrameOf } from './types';

/**
 * A row's frame and its label (the names in `names` first), from the frame's id: the active workspace's names,
 * which its caller selects. One function while the frames and names stay, so rows drawn with it don't re-render
 * for a new batch.
 */
export function useFrameOf(names: Readonly<Record<string, string>>): FrameOf {
  const frames = useFrameStore((s) => s.frames);
  return useMemo(() => {
    const labels = frameLabels(frames, names);
    return (frameId) => ({ frame: frames.find((f) => f.id === frameId), label: frameId ? labels.get(frameId) : undefined });
  }, [frames, names]);
}
