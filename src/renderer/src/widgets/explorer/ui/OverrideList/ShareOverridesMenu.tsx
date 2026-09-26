import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { Menu } from '@/shared/ui/menu';
import { useOverrideStore } from '@/entities/override';
import { useRuleStore } from '@/entities/rule';
import { exportOverrides, importOverrides } from '@/features/override/share';

/** The Overrides section's menu: the workspace's overrides and rules saved as one file, or a file's added to it (a teammate's fix). */
export function ShareOverridesMenu() {
  const hasOverrides = useOverrideStore((s) => Object.keys(s.byId).length > 0);
  const hasRules = useRuleStore((s) => Object.keys(s.byId).length > 0);
  return (
    <Menu
      label="Share overrides"
      align="end"
      items={[
        { label: 'Export overrides and rules…', icon: icons.ExportIcon, disabled: !hasOverrides && !hasRules, onSelect: () => void exportOverrides() },
        { label: 'Import overrides and rules…', icon: icons.ImportIcon, onSelect: () => void importOverrides() },
      ]}
    >
      <IconButton icon={icons.ExportIcon} label="Share overrides" size="sm" data-testid="overrides-share" />
    </Menu>
  );
}
