import { api, errorMessage } from '@/shared/api';
import { confirm } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';
import { isPageDirty, PAGE_SCOPES, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { useRuleStore } from '@/entities/rule';
import { useWorkspaceStore } from '@/entities/workspace';
import { savesSettled } from '@/features/save-override';
import { closeSessionTabs, flushSession, restoreSession, sessionPending, startSessionSync } from '../session';
import { workspaceSwitch } from './workspaceSwitch';

/**
 * Shows another workspace: this one's pending writes finish (unsaved edits
 * stay as drafts), its tabs close (with its rule pages, whose unapplied edits
 * are lost: asked first), the page moves to the other one's last page with
 * its overrides and rules, and its tabs reopen.
 */
export async function switchWorkspace(id: string): Promise<void> {
  const { activeId, setSwitching } = useWorkspaceStore.getState();
  if (workspaceSwitch.busy || id === activeId) return;
  workspaceSwitch.busy = true;
  try {
    // Rule pages aren't kept on disk: their unapplied edits go with them. Asked before the switch shows as running.
    if (useTabStore.getState().pages.some((p) => PAGE_SCOPES[p.page] === 'workspace' && isPageDirty(p))) {
      const ok = await confirm({ title: 'Discard your unapplied rule changes?', confirmLabel: 'Switch anyway', tone: 'danger' });
      if (!ok) return;
    }
    setSwitching(id);
    // A save still running belongs to the workspace it started in.
    await savesSettled();
    // Still synced meanwhile: what is typed while the drafts are written is written too.
    let flushed = await flushSession();
    while (flushed && sessionPending()) flushed = await flushSession();
    if (!flushed) {
      const ok = await confirm({
        title: 'Your unsaved edits could not be kept',
        body: 'Switch workspaces anyway and lose them?',
        confirmLabel: 'Switch anyway',
        tone: 'danger',
      });
      if (!ok) return;
    }
    // In the same task as the last check: nothing can be typed in between.
    closeSessionTabs();
    try {
      await api.switchWorkspace(id);
    } catch (err) {
      toast({ title: 'Could not switch workspaces', description: errorMessage(err), tone: 'danger' });
    }
    try {
      // Whichever is active now (the one left, if switching failed), with its overrides, rules and tabs.
      const [workspaces, overrides, rules] = await Promise.all([api.getWorkspaces(), api.listOverrides(), api.listRules()]);
      useWorkspaceStore.getState().setAll(workspaces);
      useOverrideStore.getState().setAll(overrides);
      useRuleStore.getState().setAll(rules);
      await restoreSession();
      startSessionSync();
    } catch (err) {
      // Not synced: with its tabs not back, the next change would write over the ones on disk. The next start reopens them.
      toast({ title: 'Could not reopen the workspace’s tabs', description: errorMessage(err), tone: 'danger' });
    }
  } finally {
    workspaceSwitch.busy = false;
    setSwitching(null);
  }
}
