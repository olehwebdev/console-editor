import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useRuleStore } from '@/entities/rule';
import { useSettingsStore } from '@/entities/settings';
import { useWorkspaceStore } from '@/entities/workspace';

/** Turns a rule on or off (optimistically), then reloads the page when enabled in settings. Refused while workspaces switch. */
export async function setRuleEnabled(id: string, enabled: boolean): Promise<void> {
  if (useWorkspaceStore.getState().switchingTo !== null) return;
  const store = useRuleStore.getState();
  const previous = store.byId[id];
  if (!previous || previous.enabled === enabled) return;
  store.upsert({ ...previous, enabled });
  try {
    useRuleStore.getState().upsert(await api.updateRule(id, { enabled }));
    if (useSettingsStore.getState().settings.autoReloadOnSave) await api.reload();
  } catch (err) {
    // Unless it was deleted meanwhile: a rollback would bring it back.
    if (useRuleStore.getState().byId[id]) useRuleStore.getState().upsert(previous);
    toast({ title: `Could not turn the rule ${enabled ? 'on' : 'off'}`, description: errorMessage(err), tone: 'danger' });
  }
}
