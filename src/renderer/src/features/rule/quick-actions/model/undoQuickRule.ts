import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useSettingsStore } from '@/entities/settings';
import { useWorkspaceStore } from '@/entities/workspace';

/** The quick rule's Undo: deletes it (from whichever workspace it was made in), then reloads when enabled in settings. */
export async function undoQuickRule(id: string): Promise<void> {
  if (useWorkspaceStore.getState().switchingTo !== null) return;
  try {
    await api.deleteRule(id);
    if (useSettingsStore.getState().settings.autoReloadOnSave) await api.reload();
  } catch (err) {
    toast({ title: 'Could not undo the rule', description: errorMessage(err), tone: 'danger' });
  }
}
