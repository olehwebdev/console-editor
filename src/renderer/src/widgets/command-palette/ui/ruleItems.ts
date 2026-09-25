import type { Rule } from '@common/types';
import { icons } from '@/shared/config';
import type { CommandItem } from '@/shared/ui/command-palette';
import { RULE_ACTION_GLYPHS, RULE_ACTION_LABELS, RULE_ACTION_TITLES, ruleLabel } from '@/entities/rule';
import { openRuleEditor } from '@/features/rule/edit';
import { setRuleEnabled } from '@/features/rule/toggle';
import { RULE_ITEM_PREFIX } from './constants';

/** The palette's Rules group: each rule opens, and turns on or off. */
export function ruleItems(rules: readonly Rule[]): CommandItem[] {
  return rules.flatMap((rule) => {
    const label = ruleLabel(rule);
    const keywords = [rule.match.pattern, RULE_ACTION_LABELS[rule.action]];
    return [
      {
        id: `${RULE_ITEM_PREFIX.open}${rule.id}`,
        label,
        hint: RULE_ACTION_TITLES[rule.action],
        icon: RULE_ACTION_GLYPHS[rule.action].icon,
        keywords,
        onSelect: () => openRuleEditor(rule),
      },
      {
        id: `${RULE_ITEM_PREFIX.toggle}${rule.id}`,
        label: `${rule.enabled ? 'Turn off' : 'Turn on'} rule: ${label}`,
        icon: icons.LiveIcon,
        keywords: [...keywords, 'enable', 'disable'],
        onSelect: () => void setRuleEnabled(rule.id, !rule.enabled),
      },
    ];
  });
}
