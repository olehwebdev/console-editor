import type { Breakpoint } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useWorkspaceStore } from '@/entities/workspace';

/** Replaces the shown workspace's breakpoints with what `edit` makes of them: shown at once, then saved (the next request stops). */
export async function setBreakpoints(edit: (breakpoints: readonly Breakpoint[]) => Breakpoint[]): Promise<void> {
  const { activeId, workspaces, patch, setAll } = useWorkspaceStore.getState();
  const workspace = workspaces.find((w) => w.id === activeId);
  if (!workspace) return;
  const breakpoints = edit(workspace.breakpoints);
  patch(workspace.id, { breakpoints });
  try {
    await api.updateWorkspace(workspace.id, { breakpoints });
  } catch (err) {
    toast({ title: 'Could not change the breakpoints', description: errorMessage(err), tone: 'danger' });
    setAll(await api.getWorkspaces());
  }
}
