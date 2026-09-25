import type { CreateRuleInput } from '@common/types';
import { RULE_NOTE_CHECKS } from './ruleNoteChecks';
import type { RuleNoteCheck } from './types';

/** The notes that apply to a rule being written for the page at `pageUrl` ('' when none is shown). */
export function ruleNotes(value: CreateRuleInput, pageUrl: string): RuleNoteCheck[] {
  return RULE_NOTE_CHECKS.filter((check) => check.applies(value, pageUrl));
}
