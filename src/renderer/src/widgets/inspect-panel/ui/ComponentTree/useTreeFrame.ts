import { useEffect } from 'react';
import { useTreeStore } from '@/entities/inspector';
import { usePageStackStore } from '@/entities/page-stack';
import { chooseFrame } from '@/features/inspect/tree';
import { nameLevels } from './nameLevels';
import { treeFrames } from './treeFrames';

/** The frames the tree can show and the one it shows: the one chosen, else the first with one the tree reads. */
export function useTreeFrame(): { frames: string[]; frameId: string | null } {
  const stacks = usePageStackStore((s) => s.stacks);
  const chosen = useTreeStore((s) => s.frameId);
  const frames = treeFrames(stacks);
  const frameId = chosen && frames.includes(chosen) ? chosen : (frames[0] ?? null);
  const shown = useTreeStore((s) => s.frameId === frameId && '' in s.levels);

  // The tree is read from the page over IPC: once a frame is to be shown, its top components are.
  useEffect(() => {
    if (frameId && !shown) void chooseFrame(frameId).then(nameLevels);
  }, [frameId, shown]);

  return { frames, frameId };
}
