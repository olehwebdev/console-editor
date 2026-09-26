import type { RuleAction } from '@common/types';
import { RULE_ACTION_FIELDS } from './actionFields';
import type { RuleActionFieldsProps } from './types';

/** The fields of the rule's own action. */
export function ActionFields({ action, ...props }: RuleActionFieldsProps & { action: RuleAction }) {
  const Fields = RULE_ACTION_FIELDS[action];
  return <Fields {...props} />;
}
