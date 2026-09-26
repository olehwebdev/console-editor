import type { CreateRuleInput } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { firstErrorMessage } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { useTabStore } from '@/entities/editor-tab';
import { useRuleStore } from '@/entities/rule';
import { useSettingsStore } from '@/entities/settings';
import { isWorkspaceShown, useWorkspaceStore } from '@/entities/workspace';
import { openRuleEditor } from './openRuleEditor';
import { pendingPages } from './pendingPages';
import { ruleForms } from './ruleForms';
import { trimPattern } from './trimPattern';

/**
 * Creates the rule a new-rule page describes (Create, Enter, Ctrl/Cmd+S), then swaps the page for
 * the rule's own and reloads the page when enabled in settings. Invalid input is not sent.
 * Refused while workspaces switch.
 */
export async function createRulePage(pageId: string): Promise<void> {
  const { activeId, switchingTo } = useWorkspaceStore.getState();
  const entry = ruleForms.get(pageId);
  if (switchingTo !== null || pendingPages.has(pageId) || !entry) return;
  pendingPages.add(pageId);
  const send = async (value: CreateRuleInput) => {
    try {
      const created = await api.createRule(trimPattern(value));
      toast({ title: 'Rule added', tone: 'success', duration: TOAST_DURATION.confirm });
      // Added to the workspace it began in; another shown since has its own rules and tabs.
      if (!isWorkspaceShown(activeId)) return;
      useRuleStore.getState().upsert(created);
      useTabStore.getState().remove(pageId);
      openRuleEditor(created);
      if (useSettingsStore.getState().settings.autoReloadOnSave) await api.reload();
    } catch (err) {
      toast({ title: 'Could not add the rule', description: errorMessage(err), tone: 'danger' });
    }
  };
  try {
    await entry.form.handleSubmit(send, (errors) => toast({ title: 'Rule not added', description: firstErrorMessage(errors), tone: 'danger' }))();
  } finally {
    pendingPages.delete(pageId);
  }
}
