import { sameRuleInput } from '@common/rules';
import type { CreateRuleInput } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { firstErrorMessage } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { type PageTabOf, useTabStore } from '@/entities/editor-tab';
import { toRuleInput, useRuleStore } from '@/entities/rule';
import { useSettingsStore } from '@/entities/settings';
import { isWorkspaceShown, useWorkspaceStore } from '@/entities/workspace';
import { openRuleEditor } from './openRuleEditor';
import { patchFor } from './patchFor';
import { pendingPages } from './pendingPages';
import { rebaseRuleForm } from './rebaseRuleForm';
import { ruleForms } from './ruleForms';
import { trimPattern } from './trimPattern';

/**
 * Applies a rule page's edits (Apply, Enter, Ctrl/Cmd+S): checks them as the form does, sends what
 * changed, keeps only what was typed meanwhile as edits, retitles the tab and reloads the page when
 * enabled in settings. Invalid edits are not sent. Refused while workspaces switch.
 */
export async function applyRulePage(pageId: string): Promise<void> {
  const { activeId, switchingTo } = useWorkspaceStore.getState();
  if (switchingTo !== null || pendingPages.has(pageId)) return;
  const page = useTabStore.getState().pages.find((p): p is PageTabOf<'rule'> => p.id === pageId && p.page === 'rule');
  const rule = page && useRuleStore.getState().byId[page.ruleId];
  const entry = ruleForms.get(pageId);
  if (!page?.dirty || !rule || !entry) return;
  const saved = toRuleInput(rule);
  // Edits made to an older version of the rule are not applied over a newer one.
  if (!sameRuleInput(entry.base, saved)) return;
  pendingPages.add(pageId);
  const send = async (edited: CreateRuleInput) => {
    const patch = patchFor(saved, trimPattern(edited));
    // Only spaces around the pattern changed: nothing to send, and the pattern shows as saved.
    if (Object.keys(patch).length === 0) {
      entry.form.setValue('match.pattern', saved.match.pattern, { shouldDirty: true });
      return;
    }
    try {
      const updated = await api.updateRule(rule.id, patch);
      toast({ title: 'Rule updated', tone: 'success', duration: TOAST_DURATION.confirm });
      // Applied in the workspace it began in; another shown since has its own rules and tabs.
      if (!isWorkspaceShown(activeId)) return;
      useRuleStore.getState().upsert(updated);
      rebaseRuleForm(pageId, toRuleInput(updated));
      openRuleEditor(updated);
      if (useSettingsStore.getState().settings.autoReloadOnSave) await api.reload();
    } catch (err) {
      toast({ title: 'Could not update the rule', description: errorMessage(err), tone: 'danger' });
    }
  };
  try {
    await entry.form.handleSubmit(send, (errors) => toast({ title: 'Rule not applied', description: firstErrorMessage(errors), tone: 'danger' }))();
  } finally {
    pendingPages.delete(pageId);
  }
}
