import { useFrameLookup, type FrameLookup } from '@/entities/frame';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';

/** A workspace with no frame names yet: one shared object, so selecting it never re-renders. */
const NO_NAMES: Readonly<Record<string, string>> = {};

/**
 * The page's frames with their labels (the names this workspace gave them
 * first), and what a row shows of its frame, including frames that have gone.
 */
export function useFrameDirectory(): FrameLookup & { names: Readonly<Record<string, string>> } {
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  return { ...useFrameLookup(names), names };
}
