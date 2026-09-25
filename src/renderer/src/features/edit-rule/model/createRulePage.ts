import { validateRuleInput } from '@common/rules';
import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { toast } from '@/shared/ui/toast';
import { type PageTabOf, useTabStore } from '@/entities/editor-tab';
import { useRuleStore } from '@/entities/rule';
import { useSettingsStore } from '@/entities/settings';
import { useWorkspaceStore } from '@/entities/workspace';
import { openRuleEditor } from './openRuleEditor';
import { pendingPages } from './pendingPages';
import { trimPattern } from './trimPattern';

/**
 * Creates the rule a new-rule page describes (Create, Enter, Ctrl/Cmd+S), then swaps the page for
 * the rule's own and reloads the page when enabled in settings. Invalid input is not sent.
 * Refused while workspaces switch.
 */
export async function createRulePage(pageId: string): Promise<void> {
  if (useWorkspaceStore.getState().switchingTo !== null || pendingPages.has(pageId)) return;
  const page = useTabStore.getState().pages.find((p): p is PageTabOf<'new-rule'> => p.id === pageId && p.page === 'new-rule');
  if (!page) return;
  const value = trimPattern(page.draft?.value ?? page.seed);
  const error = validateRuleInput(value);
  if (error) {
    toast({ title: 'Rule not added', description: error, tone: 'danger' });
    return;
  }
  pendingPages.add(pageId);
  try {
    const created = await api.createRule(value);
    useRuleStore.getState().upsert(created);
    useTabStore.getState().remove(pageId);
    openRuleEditor(created);
    toast({ title: 'Rule added', tone: 'success', duration: TOAST_DURATION.confirm });
    if (useSettingsStore.getState().settings.autoReloadOnSave) await api.reload();
  } catch (err) {
    toast({ title: 'Could not add the rule', description: errorMessage(err), tone: 'danger' });
  } finally {
    pendingPages.delete(pageId);
  }
}
