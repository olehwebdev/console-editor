import type { Breakpoint } from '@common/types';
import { useWorkspaceStore } from '@/entities/workspace';
import { NO_BREAKPOINTS } from './constants';

/** The shown workspace's breakpoints now (outside React). */
export function currentBreakpoints(): readonly Breakpoint[] {
  const { workspaces, activeId } = useWorkspaceStore.getState();
  return workspaces.find((w) => w.id === activeId)?.breakpoints ?? NO_BREAKPOINTS;
}
