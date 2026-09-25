import { useMemo } from 'react';
import type { CommandGroup } from '@/shared/ui/command-palette';
import { useActionStore } from '@/entities/action';
import { useFrameStore } from '@/entities/frame';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import { actionGroup } from './actionGroup';
import { NO_NAMES } from './constants';

/** The palette's "Run action" group, kept as one reference while the actions, frames and frame names stay the same. */
export function useActionGroup(onNewAction: () => void): CommandGroup {
  const actions = useActionStore((s) => s.actions);
  const frames = useFrameStore((s) => s.frames);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  return useMemo(() => actionGroup(actions, frames, names, onNewAction), [actions, frames, names, onNewAction]);
}
