import { useMemo } from 'react';
import { frameKey, frameLabel, frameLabels } from '../lib';
import { useFrameStore } from './store';
import type { FrameLookup } from './types';

/**
 * The page's frames with their labels (the names in `names` first), and what a row shows of its frame, including
 * frames that have gone. `names` is the active workspace's, which its caller selects.
 */
export function useFrameLookup(names: Readonly<Record<string, string>>): FrameLookup {
  const frames = useFrameStore((s) => s.frames);
  const seen = useFrameStore((s) => s.seen);
  return useMemo(() => {
    const labels = frameLabels(frames, names);
    const live = new Set(frames.map((f) => f.id));
    const resolve = (frameId: string | null | undefined) => {
      const frame = frameId ? seen[frameId] : undefined;
      if (!frame) return null;
      return { key: frameKey(frame), label: labels.get(frame.id) ?? frameLabel(frame, names), url: frame.url, gone: !live.has(frame.id) };
    };
    return { frames, labels, resolve };
  }, [frames, seen, names]);
}
