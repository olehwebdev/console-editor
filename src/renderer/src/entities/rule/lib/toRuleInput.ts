import type { CreateRuleInput, Rule } from '@common/types';

/** What a saved rule would be created from: everything but its own state (id, on/off, timestamps). */
export function toRuleInput(rule: Rule): CreateRuleInput {
  const { id: _id, enabled: _enabled, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = rule;
  return input;
}
