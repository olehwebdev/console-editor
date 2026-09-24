import type { WorkspaceStore } from './types';

export const selectActiveWorkspace = (s: WorkspaceStore) => s.workspaces.find((w) => w.id === s.activeId) ?? null;
