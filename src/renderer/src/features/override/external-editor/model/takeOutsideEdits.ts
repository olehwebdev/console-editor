import { api } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { toast } from '@/shared/ui/toast';
import { overrideLabel, useOverrideStore } from '@/entities/override';
import { useSettingsStore } from '@/entities/settings';
import { syncEditedTab } from './syncEditedTab';

/**
 * After another editor changed overrides' files (now served): updates their tabs, says so, and reloads
 * the page as a save does.
 */
export async function takeOutsideEdits(overrideIds: readonly string[]): Promise<void> {
  for (const id of overrideIds) await syncEditedTab(id);
  const { byId } = useOverrideStore.getState();
  const edited = overrideIds.flatMap((id) => byId[id] ?? []);
  const [first] = edited;
  if (!first) return;
  const reload = useSettingsStore.getState().settings.autoReloadOnSave && edited.some((o) => o.enabled);
  toast({
    title: edited.length > 1 ? `${edited.length} overrides changed in another editor` : `${overrideLabel(first.sourceUrl, first.request)} changed in another editor`,
    description: reload ? 'Reloading the page with the new version.' : undefined,
    tone: 'success',
    duration: TOAST_DURATION.confirm,
  });
  if (reload) await api.reload().catch(() => undefined);
}
