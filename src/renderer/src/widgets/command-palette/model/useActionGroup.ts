import { useMemo } from 'react';
import type { CommandGroup } from '@/shared/ui/command-palette';
import { useActionStore } from '@/entities/action';
import { useFrameStore } from '@/entities/frame';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import { actionGroup } from './actionGroup';
import { NO_NAMES } from './constants';

/** The palette's "Run action" group, kept as one reference while the actions, frames, frame names and the panel's place stay the same. */
export function useActionGroup(onNewAction: () => void): CommandGroup {
  const actions = useActionStore((s) => s.actions);
  const detached = useActionStore((s) => s.window.detached);
  const frames = useFrameStore((s) => s.frames);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  return useMemo(() => actionGroup(actions, frames, { names, detached, onNewAction }), [actions, frames, names, detached, onNewAction]);
}
