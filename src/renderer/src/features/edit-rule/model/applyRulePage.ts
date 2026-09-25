import { sameRuleInput, validateRuleInput } from '@common/rules';
import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { toast } from '@/shared/ui/toast';
import { type PageTabOf, useTabStore } from '@/entities/editor-tab';
import { toRuleInput, useRuleStore } from '@/entities/rule';
import { useSettingsStore } from '@/entities/settings';
import { useWorkspaceStore } from '@/entities/workspace';
import { openRuleEditor } from './openRuleEditor';
import { patchFor } from './patchFor';
import { pendingPages } from './pendingPages';
import { trimPattern } from './trimPattern';

/**
 * Applies a rule page's edits (Apply, Enter, Ctrl/Cmd+S): sends what changed, clears the draft,
 * retitles the tab and reloads the page when enabled in settings. Invalid edits are not sent.
 * Refused while workspaces switch.
 */
export async function applyRulePage(pageId: string): Promise<void> {
  if (useWorkspaceStore.getState().switchingTo !== null || pendingPages.has(pageId)) return;
  const page = useTabStore.getState().pages.find((p): p is PageTabOf<'rule'> => p.id === pageId && p.page === 'rule');
  const rule = page && useRuleStore.getState().byId[page.ruleId];
  if (!page || !rule) return;
  const saved = toRuleInput(rule);
  // Edits made to an older version of the rule are not applied over a newer one.
  const edited = page.draft && sameRuleInput(page.draft.base, saved) ? page.draft.value : undefined;
  if (!edited) return;
  const value = trimPattern(edited);
  const error = validateRuleInput(value);
  if (error) {
    toast({ title: 'Rule not applied', description: error, tone: 'danger' });
    return;
  }
  const patch = patchFor(saved, value);
  // Only spaces around the pattern changed: nothing to send.
  if (Object.keys(patch).length === 0) {
    useTabStore.getState().setPageDraft(pageId, undefined);
    return;
  }
  pendingPages.add(pageId);
  try {
    const updated = await api.updateRule(rule.id, patch);
    useRuleStore.getState().upsert(updated);
    useTabStore.getState().setPageDraft(pageId, undefined);
    openRuleEditor(updated);
    toast({ title: 'Rule updated', tone: 'success', duration: TOAST_DURATION.confirm });
    if (useSettingsStore.getState().settings.autoReloadOnSave) await api.reload();
  } catch (err) {
    toast({ title: 'Could not update the rule', description: errorMessage(err), tone: 'danger' });
  } finally {
    pendingPages.delete(pageId);
  }
}
