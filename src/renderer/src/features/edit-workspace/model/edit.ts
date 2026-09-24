import type { WorkspacePatch } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useWorkspaceStore } from '@/entities/workspace';

/** Renames a workspace or changes its tile: shown at once, then saved. */
export async function editWorkspace(id: string, patch: WorkspacePatch): Promise<void> {
  useWorkspaceStore.getState().patch(id, patch);
  try {
    await api.updateWorkspace(id, patch);
  } catch (err) {
    toast({ title: 'Could not change the workspace', description: errorMessage(err), tone: 'danger' });
    useWorkspaceStore.getState().setAll(await api.getWorkspaces());
  }
}
