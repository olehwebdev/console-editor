import { useMemo } from 'react';
import { TOP_FRAME_KEY, useFrameLookup } from '@/entities/frame';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import type { ResolveFrame } from './types';

/** A workspace with no frame names yet: one shared object, so selecting it never re-renders. */
const NO_NAMES: Readonly<Record<string, string>> = {};

/**
 * What a row shows of the frame that sent it (named as the console names it), including frames that
 * have gone. The top page's requests show none: most are its, and the rows need the room.
 */
export function useFrameResolver(): ResolveFrame {
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  const { resolve } = useFrameLookup(names);
  return useMemo<ResolveFrame>(
    () => (frameId) => {
      const frame = resolve(frameId);
      return frame?.key === TOP_FRAME_KEY ? null : frame;
    },
    [resolve],
  );
}
