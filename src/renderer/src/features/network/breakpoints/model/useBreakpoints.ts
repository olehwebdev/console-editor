import type { Breakpoint } from '@common/types';
import { useWorkspaceStore } from '@/entities/workspace';
import { NO_BREAKPOINTS } from './constants';

/** The breakpoints of the workspace shown. */
export function useBreakpoints(): readonly Breakpoint[] {
  return useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.activeId)?.breakpoints ?? NO_BREAKPOINTS);
}
