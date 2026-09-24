import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useWorkspaceStore } from '@/entities/workspace';
import { switchWorkspace } from './switchWorkspace';
import { workspaceSwitch } from './workspaceSwitch';

/** Adds an empty workspace and switches to it. Resolves true once it is the one shown. */
export async function createWorkspace(): Promise<boolean> {
  if (workspaceSwitch.busy) return false;
  try {
    const created = await api.createWorkspace();
    await switchWorkspace(created.id);
    if (useWorkspaceStore.getState().activeId === created.id) return true;
    // Not switched to (cancelled, or it failed): an empty workspace nobody asked to keep.
    await api.deleteWorkspace(created.id).catch(() => undefined);
    return false;
  } catch (err) {
    toast({ title: 'Could not add a workspace', description: errorMessage(err), tone: 'danger' });
    return false;
  }
}
