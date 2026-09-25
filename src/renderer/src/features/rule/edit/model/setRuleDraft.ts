import { sameRuleInput } from '@common/rules';
import { type RulePageDraft, useTabStore } from '@/entities/editor-tab';

/** Keeps a rule page's edits; edits that lead back to where they started are no edits (Revert). */
export function setRuleDraft(pageId: string, draft: RulePageDraft | undefined): void {
  useTabStore.getState().setPageDraft(pageId, draft && !sameRuleInput(draft.base, draft.value) ? draft : undefined);
}
