import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { toast } from '@/shared/ui/toast';
import { useOverrideStore } from '@/entities/override';
import { useSettingsStore } from '@/entities/settings';
import { responseRuleProblem } from './responseRuleProblem';
import type { ResponseRuleValue } from './types';

/** Changes what a response override matches besides its URL, and how it answers. Reloads the page as saving does. */
export async function applyResponse(id: string, rule: ResponseRuleValue): Promise<boolean> {
  const problem = responseRuleProblem(rule);
  if (problem) {
    toast({ title: "Can't apply this response rule", description: problem, tone: 'danger' });
    return false;
  }
  try {
    useOverrideStore.getState().upsert(await api.updateOverride(id, rule));
    const reload = useSettingsStore.getState().settings.autoReloadOnSave;
    toast({ title: 'Response rule updated', description: reload ? 'Reloading the page.' : undefined, tone: 'success', duration: TOAST_DURATION.confirm });
    if (reload) await api.reload();
    return true;
  } catch (err) {
    toast({ title: 'Could not update the response rule', description: errorMessage(err), tone: 'danger' });
    return false;
  }
}
