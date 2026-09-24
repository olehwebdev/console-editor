import { api, errorMessage } from '@/shared/api';
import { confirm } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';
import { useOverrideStore } from '@/entities/override';
import { useWorkspaceStore, workspaceLabel } from '@/entities/workspace';
import { savesSettled } from '@/features/save-override';
import { closeSessionTabs, flushSession, restoreSession, startSessionSync, stopSessionSync } from './session';

/** A switch is running (they take turns: each one closes and reopens every tab). */
let busy = false;

/**
 * Shows another workspace: this one's pending writes finish (unsaved edits
 * stay as drafts), its tabs close, the page moves to the other one's last
 * page with its overrides, and its tabs reopen.
 */
export async function switchWorkspace(id: string): Promise<void> {
  const { activeId, setSwitching } = useWorkspaceStore.getState();
  if (busy || id === activeId) return;
  busy = true;
  setSwitching(id);
  try {
    // A save still running belongs to the workspace it started in.
    await savesSettled();
    stopSessionSync();
    if (!(await flushSession())) {
      const ok = await confirm({
        title: 'Your unsaved edits could not be kept',
        body: 'Switch workspaces anyway and lose them?',
        confirmLabel: 'Switch anyway',
        tone: 'danger',
      });
      if (!ok) {
        startSessionSync();
        return;
      }
    }
    closeSessionTabs();
    try {
      await api.switchWorkspace(id);
    } catch (err) {
      toast({ title: 'Could not switch workspaces', description: errorMessage(err), tone: 'danger' });
    }
    try {
      // Whichever is active now (the one left, if switching failed), with its overrides and tabs.
      const [workspaces, overrides] = await Promise.all([api.getWorkspaces(), api.listOverrides()]);
      useWorkspaceStore.getState().setAll(workspaces);
      useOverrideStore.getState().setAll(overrides);
      await restoreSession();
      startSessionSync();
    } catch (err) {
      // Not synced: with its tabs not back, the next change would write over the ones on disk. The next start reopens them.
      toast({ title: 'Could not reopen the workspace’s tabs', description: errorMessage(err), tone: 'danger' });
    }
  } finally {
    busy = false;
    setSwitching(null);
  }
}

/** Adds an empty workspace and switches to it. Resolves true once it is the one shown. */
export async function createWorkspace(): Promise<boolean> {
  if (busy) return false;
  try {
    const created = await api.createWorkspace();
    await switchWorkspace(created.id);
    return useWorkspaceStore.getState().activeId === created.id;
  } catch (err) {
    toast({ title: 'Could not add a workspace', description: errorMessage(err), tone: 'danger' });
    return false;
  }
}

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
