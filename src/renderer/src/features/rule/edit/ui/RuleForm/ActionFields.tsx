import type { ComponentType } from 'react';
import type { RuleAction } from '@common/types';
import { RULE_ACTION_FIELDS } from './actionFields';
import type { RuleActionFieldsProps } from './types';

/** The fields of the rule's own action. Generic so each action reaches its own fields without a cast. */
export function ActionFields<A extends RuleAction>(props: RuleActionFieldsProps<A>) {
  const Fields: ComponentType<RuleActionFieldsProps<A>> = RULE_ACTION_FIELDS[props.value.action];
  return <Fields {...props} />;
}
