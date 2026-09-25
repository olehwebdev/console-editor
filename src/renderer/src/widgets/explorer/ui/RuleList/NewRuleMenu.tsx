import { RULE_ACTIONS } from '@common/types';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { Menu } from '@/shared/ui/menu';
import { RULE_ACTION_GLYPHS, RULE_ACTION_TITLES } from '@/entities/rule';
import { openNewRule, RULE_SEEDS } from '@/features/edit-rule';

/** The Rules section's +: a new rule of each action, written from scratch. */
export function NewRuleMenu() {
  return (
    <Menu
      label="New rule"
      align="end"
      items={RULE_ACTIONS.map((action) => ({
        label: `${RULE_ACTION_TITLES[action]}…`,
        icon: RULE_ACTION_GLYPHS[action].icon,
        onSelect: () => openNewRule(RULE_SEEDS[action]()),
      }))}
    >
      <IconButton icon={icons.AddIcon} label="New rule" size="sm" data-testid="rule-add" />
    </Menu>
  );
}
