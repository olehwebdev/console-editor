import type { CreateRuleInput } from '@common/types';

/** The input as it is saved: a pattern's surrounding spaces are never meant (as when an override's match is applied). */
export function trimPattern(input: CreateRuleInput): CreateRuleInput {
  return { ...input, match: { ...input.match, pattern: input.match.pattern.trim() } };
}
