import { RULE_ACTIONS } from '@common/types';
import type { CommandItem } from '@/shared/ui/command-palette';
import { RULE_ACTION_GLYPHS, RULE_ACTION_TITLES } from '@/entities/rule';
import { openNewRule, RULE_SEEDS } from '@/features/rule/edit';
import { NEW_RULE_ITEM_PREFIX, NEW_RULE_KEYWORDS } from './constants';

/** Actions that start a new rule of each kind. */
export function newRuleItems(): CommandItem[] {
  return RULE_ACTIONS.map((action) => ({
    id: `${NEW_RULE_ITEM_PREFIX}${action}`,
    label: `${RULE_ACTION_TITLES[action]}…`,
    icon: RULE_ACTION_GLYPHS[action].icon,
    keywords: NEW_RULE_KEYWORDS[action],
    onSelect: () => openNewRule(RULE_SEEDS[action]()),
  }));
}
