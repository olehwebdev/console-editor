import { api, errorMessage } from '@/shared/api';
import { confirm } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';
import { useWorkspaceStore, workspaceLabel } from '@/entities/workspace';
import { switchWorkspace } from './switchWorkspace';

/** Deletes a workspace once you confirm; the one in use hands over to its neighbour first. */
export async function deleteWorkspace(id: string): Promise<void> {
  const { workspaces } = useWorkspaceStore.getState();
  const target = workspaces.find((w) => w.id === id);
  if (!target || workspaces.length < 2) return;
  const ok = await confirm({
    title: `Delete the workspace “${workspaceLabel(target)}”?`,
    body: 'Its overrides, open tabs and unsaved edits are deleted. Sign-ins to sites are kept.',
    confirmLabel: 'Delete',
    tone: 'danger',
  });
  if (!ok) return;
  const { workspaces: now, activeId } = useWorkspaceStore.getState();
  if (id === activeId) {
    const index = now.findIndex((w) => w.id === id);
    const neighbour = now[index + 1] ?? now[index - 1];
    if (neighbour) await switchWorkspace(neighbour.id);
    // Still the one in use: switching failed, or was cancelled.
    if (useWorkspaceStore.getState().activeId === id) return;
  }
  try {
    await api.deleteWorkspace(id);
  } catch (err) {
    toast({ title: 'Could not delete the workspace', description: errorMessage(err), tone: 'danger' });
  }
}
