import { THROTTLING_PRESETS } from '@common/types';
import { NO_THROTTLING } from '@common/throttling';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { Menu } from '@/shared/ui/menu';
import { THROTTLING_LABELS, useSettingsStore } from '@/entities/settings';
import { setThrottling } from '../model/setThrottling';

/** The network speed menu: lit while the page is slowed down or offline. */
export function ThrottlingMenu() {
  const throttling = useSettingsStore((s) => s.settings.throttling);
  const on = throttling !== NO_THROTTLING;
  return (
    <Menu label="Network speed" align="end" items={THROTTLING_PRESETS.map((preset) => ({ label: THROTTLING_LABELS[preset], checked: preset === throttling, onSelect: () => void setThrottling(preset) }))}>
      <IconButton icon={icons.ThrottleIcon} label={on ? `Network speed: ${THROTTLING_LABELS[throttling]}` : 'Network speed'} size="sm" active={on} data-testid="network-throttling" />
    </Menu>
  );
}
