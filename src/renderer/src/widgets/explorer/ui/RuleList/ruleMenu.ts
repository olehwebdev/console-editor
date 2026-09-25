import type { Rule } from '@common/types';
import { icons } from '@/shared/config';
import type { MenuItem } from '@/shared/ui/menu';
import { deleteRule } from '@/features/delete-rule';
import { openRuleEditor } from '@/features/edit-rule';
import { setRuleEnabled } from '@/features/toggle-rule';

/** A rule row's context menu. */
export function ruleMenu(rule: Rule): MenuItem[] {
  return [
    { label: 'Edit…', icon: icons.EditIcon, onSelect: () => openRuleEditor(rule) },
    { label: rule.enabled ? 'Turn off' : 'Turn on', icon: icons.LiveIcon, onSelect: () => void setRuleEnabled(rule.id, !rule.enabled) },
    { label: 'Copy pattern', icon: icons.CopyIcon, onSelect: () => void navigator.clipboard.writeText(rule.match.pattern) },
    { separator: true },
    { label: 'Delete rule', icon: icons.DeleteIcon, danger: true, onSelect: () => void deleteRule(rule.id) },
  ];
}
