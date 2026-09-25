import { useTabStore, type PageTabOf } from '@/entities/editor-tab';
import { toRuleInput, useRuleStore } from '@/entities/rule';
import { rebaseRuleDraft } from '@/features/edit-rule';
import type { AppEventOf } from '../types';

/**
 * Takes the main process's rule list: pages of deleted rules close, and a page whose rule changed
 * (its own Apply landing) keeps only the edits typed since.
 */
export function syncRules(event: AppEventOf<'rules-changed'>): void {
  useRuleStore.getState().setAll(event.rules);
  const rules = new Map(event.rules.map((r) => [r.id, r]));
  const rulePages = useTabStore.getState().pages.filter((p): p is PageTabOf<'rule'> => p.page === 'rule');
  useTabStore.getState().removePages(rulePages.filter((p) => !rules.has(p.ruleId)).map((p) => p.id));
  for (const page of rulePages) {
    const rule = rules.get(page.ruleId);
    if (!rule || !page.draft) continue;
    const draft = rebaseRuleDraft(page.draft, toRuleInput(rule));
    if (draft !== page.draft) useTabStore.getState().setPageDraft(page.id, draft);
  }
}
