import { sameRuleInput } from '@common/rules';
import { useTabStore, type PageTabOf } from '@/entities/editor-tab';
import { toRuleInput, useRuleStore } from '@/entities/rule';
import type { AppEventOf } from '../types';

/** Takes the main process's rule list: pages of deleted rules close, and edits made to an older version of a rule are dropped. */
export function syncRules(event: AppEventOf<'rules-changed'>): void {
  useRuleStore.getState().setAll(event.rules);
  const rules = new Map(event.rules.map((r) => [r.id, r]));
  const rulePages = useTabStore.getState().pages.filter((p): p is PageTabOf<'rule'> => p.page === 'rule');
  useTabStore.getState().removePages(rulePages.filter((p) => !rules.has(p.ruleId)).map((p) => p.id));
  for (const page of rulePages) {
    const rule = rules.get(page.ruleId);
    if (rule && page.draft && !sameRuleInput(page.draft.base, toRuleInput(rule))) useTabStore.getState().setPageDraft(page.id, undefined);
  }
}
