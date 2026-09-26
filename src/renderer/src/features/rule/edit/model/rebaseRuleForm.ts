import { sameRuleInput } from '@common/rules';
import type { CreateRuleInput } from '@common/types';
import { ruleForms } from './ruleForms';
import { trimPattern } from './trimPattern';

/**
 * A rule page's form once its rule is saved as `saved`. Only the page itself changes a rule's input,
 * so a new version is its own Apply landing: what was typed while it ran stays, as edits to `saved`,
 * and edits it already holds (spaces around the pattern aside) are no edits.
 */
export function rebaseRuleForm(pageId: string, saved: CreateRuleInput): void {
  const entry = ruleForms.get(pageId);
  if (!entry || sameRuleInput(entry.base, saved)) return;
  entry.base = saved;
  const values = entry.form.getValues();
  // What is typed stays where it is (header rows keep their keys, and focus); its errors stay with it.
  entry.form.reset(saved, { keepValues: true, keepErrors: true });
  if (sameRuleInput(trimPattern(values), saved)) entry.form.setValue('match.pattern', saved.match.pattern, { shouldDirty: true });
}
