import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { toast } from '@/shared/ui/toast';
import { useSettingsStore } from '@/entities/settings';
import { countLabel } from './countLabel';

/** Adds the overrides and rules of an export the user picks to the active workspace, says what it left out, and reloads the page as a save does. */
export async function importOverrides(): Promise<void> {
  try {
    const result = await api.importOverrides();
    if (!result) return;
    const added = [result.overrides ? countLabel(result.overrides, 'override') : '', result.rules ? countLabel(result.rules, 'rule') : ''].filter(Boolean);
    const reload = added.length > 0 && useSettingsStore.getState().settings.autoReloadOnSave;
    const notes = [
      result.present ? `${result.present} already in this workspace (yours kept).` : '',
      result.unreadable ? `${result.unreadable} couldn't be read.` : '',
      reload ? 'Reloading the page.' : '',
    ].filter(Boolean);
    toast({
      title: added.length ? `Imported ${added.join(' and ')}` : 'Nothing to import',
      description: notes.join(' ') || undefined,
      tone: added.length ? 'success' : 'warning',
      duration: TOAST_DURATION.actionable,
    });
    if (reload) await api.reload();
  } catch (err) {
    toast({ title: 'Could not import the overrides', description: errorMessage(err), tone: 'danger' });
  }
}
