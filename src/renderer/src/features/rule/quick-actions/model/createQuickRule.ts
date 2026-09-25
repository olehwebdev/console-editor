import type { CreateRuleInput } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { toast } from '@/shared/ui/toast';
import { useRuleStore } from '@/entities/rule';
import { useSettingsStore } from '@/entities/settings';
import { isWorkspaceShown, useWorkspaceStore } from '@/entities/workspace';
import { undoQuickRule } from './undoQuickRule';

/**
 * Adds a rule in one click, with an Undo in its toast, then reloads the page when enabled in
 * settings (otherwise the toast says to). Refused while workspaces switch.
 */
export async function createQuickRule(input: CreateRuleInput, title: string): Promise<void> {
  const { activeId, switchingTo } = useWorkspaceStore.getState();
  if (switchingTo !== null) return;
  try {
    const created = await api.createRule(input);
    // Added to the workspace it began in; another shown since has its own rules and page.
    const shown = isWorkspaceShown(activeId);
    if (shown) useRuleStore.getState().upsert(created);
    const reload = useSettingsStore.getState().settings.autoReloadOnSave;
    toast({
      title,
      description: reload || !shown ? undefined : 'Reload the page to apply it',
      tone: 'success',
      action: { label: 'Undo', onClick: () => void undoQuickRule(created.id) },
      duration: TOAST_DURATION.actionable,
    });
    if (shown && reload) await api.reload();
  } catch (err) {
    toast({ title: 'Could not add the rule', description: errorMessage(err), tone: 'danger' });
  }
}
