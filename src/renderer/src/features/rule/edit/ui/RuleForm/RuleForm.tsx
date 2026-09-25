import { ruleForms } from '../../model/ruleForms';
import { RuleFormFields } from './RuleFormFields';
import type { RuleFormProps } from './types';

/**
 * Writes a rule: which URLs, which request types, and its action's own fields, with notes and
 * inline validation. Holds nothing itself: the edits live in the page's form (see `openRuleForm`),
 * which outlasts it while another tab is in front. Enter submits.
 */
export function RuleForm({ pageId, ...props }: RuleFormProps) {
  const entry = ruleForms.get(pageId);
  // Every rule page opens with its form; a module reloaded in development forgets them.
  return entry ? <RuleFormFields form={entry.form} {...props} /> : null;
}
