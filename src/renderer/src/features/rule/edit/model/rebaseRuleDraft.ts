import { sameRuleInput } from '@common/rules';
import type { CreateRuleInput } from '@common/types';
import type { RulePageDraft } from '@/entities/editor-tab';
import { trimPattern } from './trimPattern';

/**
 * A rule page's edits once the rule is saved as `saved`. Only the page itself changes a rule's
 * input, so a new version is its own Apply landing: edits typed while it ran are kept on top of
 * it, and edits it already holds (spaces around the pattern aside) are no edits.
 */
export function rebaseRuleDraft(draft: RulePageDraft, saved: CreateRuleInput): RulePageDraft | undefined {
  if (sameRuleInput(trimPattern(draft.value), saved)) return undefined;
  return sameRuleInput(draft.base, saved) ? draft : { ...draft, base: saved };
}
