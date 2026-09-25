import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { confirm } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';
import { ruleLabel, useRuleStore } from '@/entities/rule';
import { useSettingsStore } from '@/entities/settings';
import { useWorkspaceStore } from '@/entities/workspace';

/** Deletes a rule after confirmation (refused while workspaces switch). Its page closes when the new rule list arrives. */
export async function deleteRule(id: string): Promise<void> {
  const rule = useRuleStore.getState().byId[id];
  if (!rule || useWorkspaceStore.getState().switchingTo !== null) return;
  const ok = await confirm({ title: 'Delete this rule?', body: ruleLabel(rule), confirmLabel: 'Delete', tone: 'danger' });
  // A switch started while the dialog was open: the rule may not be the shown workspace's any more.
  if (!ok || useWorkspaceStore.getState().switchingTo !== null) return;
  try {
    await api.deleteRule(id);
    toast({ title: 'Rule deleted', tone: 'neutral', duration: TOAST_DURATION.confirm });
    if (useSettingsStore.getState().settings.autoReloadOnSave) await api.reload();
  } catch (err) {
    toast({ title: 'Could not delete the rule', description: errorMessage(err), tone: 'danger' });
  }
}
