import { MAX_FRAME_NAME } from '@common/constants';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useWorkspaceStore } from '@/entities/workspace';

/** Names a frame (by its `frameKey`) in the active workspace; an empty name goes back to the automatic one. Shown at once, then saved. */
export async function nameFrame(key: string, name: string): Promise<void> {
  const { activeId, workspaces, patch, setAll } = useWorkspaceStore.getState();
  const workspace = workspaces.find((w) => w.id === activeId);
  if (!workspace) return;
  const frameNames = { ...workspace.frameNames };
  const trimmed = name.trim().slice(0, MAX_FRAME_NAME);
  if (trimmed) frameNames[key] = trimmed;
  else delete frameNames[key];
  patch(workspace.id, { frameNames });
  try {
    await api.updateWorkspace(workspace.id, { frameNames });
  } catch (err) {
    toast({ title: 'Could not name the frame', description: errorMessage(err), tone: 'danger' });
    setAll(await api.getWorkspaces());
  }
}
