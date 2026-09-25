import type { Breakpoint } from '../../shared/types';
import type { SessionStore } from '../store/SessionStore';

/** A workspace with no breakpoints: one shared list, so the engine's compiled matchers aren't thrown away. */
const NONE: readonly Breakpoint[] = [];

/** The active workspace's breakpoints, as the session keeps them (the same list until they change). */
export function activeBreakpoints(session: SessionStore): readonly Breakpoint[] {
  const { activeId, workspaces } = session.workspaces();
  return workspaces.find((w) => w.id === activeId)?.breakpoints ?? NONE;
}
