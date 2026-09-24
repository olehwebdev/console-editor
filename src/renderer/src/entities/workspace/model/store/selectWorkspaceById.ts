import type { WorkspaceStore } from './types';

export const selectWorkspaceById = (id: string) => (s: WorkspaceStore) => s.workspaces.find((w) => w.id === id);
